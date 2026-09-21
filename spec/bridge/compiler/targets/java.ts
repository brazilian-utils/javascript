/**
 * The Java emitter.
 *
 * A final class of static methods per module, boxed nullable fields for the options, and the
 * option reads hoisted into locals by the prologue. Java's strings are UTF-16 like
 * JavaScript's, so indexes need no translation.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
	type CharClass,
	type DataDecl,
	type ErrorDecl,
	type Expr,
	type FuncDecl,
	type Module,
	type PatternDecl,
	type Stmt,
	type StructDecl,
	type Ty,
} from "../ir.ts";
import { optionReads, pascal, prose, screaming } from "../kit.ts";

/** The record types of the module being emitted, so a literal calls the right constructor. */
let structs = new Map<string, StructDecl>();

/** The records the runtime declares, which are reached through its class. */
let external = new Set<string>();

/** The class the functions are being emitted into, for the method references. */
let className = "";

/** The declared types in scope, so a list knows whether it is an array or a growing list. */
let localTypes = new Map<string, Ty>();

/** Splits a list into fixed size chunks, which is how the big tables stay under Java's method limit. */
const chunks = <T>(items: T[], size: number): T[][] => {
	const out: T[][] = [];

	for (let index = 0; index < items.length; index += size)
		out.push(items.slice(index, index + size));

	return out;
};

const RUNTIME = resolve(import.meta.dirname, "../runtime/java.java");

/** Module level names the emitter writes verbatim. */
let verbatim = new Set<string>();

const CONTROL: Record<number, string> = {
	0x08: "\\b",
	0x09: "\\t",
	0x0a: "\\n",
	0x0c: "\\f",
	0x0d: "\\r",
};

/** Renders a string as a Java literal; `\uXXXX` is expanded before lexing, so controls differ. */
const lit = (value: string): string => {
	let out = '"';

	for (const char of value) {
		const code = char.codePointAt(0) ?? 0;

		if (char === '"') out += String.raw`\"`;
		else if (char === "\\") out += String.raw`\\`;
		else if (code < 0x20) out += CONTROL[code] ?? `\\u${code.toString(16).padStart(4, "0")}`;
		else if (code > 0xff_ff) {
			const offset = code - 0x1_00_00;

			out += `\\u${(0xd8_00 + (offset >> 10)).toString(16).padStart(4, "0")}`;
			out += `\\u${(0xdc_00 + (offset & 0x3_ff)).toString(16).padStart(4, "0")}`;
		} else if (code > 0x7e) out += `\\u${code.toString(16).padStart(4, "0")}`;
		else out += char;
	}

	return `${out}"`;
};

/** Renders an IR type. */
const type = (ty: Ty): string => {
	switch (ty.k) {
		case "string":
		case "scalar":
		case "json":
		case "enum": {
			return "String";
		}
		case "int": {
			return "long";
		}
		case "bool": {
			return "boolean";
		}
		case "void": {
			return "void";
		}
		case "list": {
			// Only the integer lists stay arrays: they are the hot path, and boxing every element
			// of a checksum would cost more than the shape is worth. Everything else is a List,
			// which is what appending needs and what a Java caller expects.
			return ty.of.k === "int" ? "long[]" : `java.util.List<${type(ty.of)}>`;
		}
		case "opt": {
			return type(ty.of);
		}
		case "named": {
			return external.has(ty.name) ? `Runtime.${ty.name}` : ty.name;
		}
		case "tasks": {
			return "Runtime.Attempts";
		}
	}
};

/** The boxed form of a type, for nullable option fields. */
const boxed = (ty: Ty): string =>
	ty.k === "int" ? "Long" : ty.k === "bool" ? "Boolean" : type(ty);

const OPS: Record<string, string> = {
	"+": "+",
	"-": "-",
	"*": "*",
	"%": "%",
	"==": "==",
	"!=": "!=",
	"<": "<",
	"<=": "<=",
	">": ">",
	">=": ">=",
	"&&": "&&",
	"||": "||",
};

/** Renders an expression. */
const expr = (node: Expr): string => {
	switch (node.k) {
		case "str": {
			return lit(node.value);
		}
		case "int": {
			return `${node.value}L`;
		}
		case "bool": {
			return String(node.value);
		}
		case "none": {
			return "null";
		}
		case "ref": {
			return verbatim.has(node.name) ? screaming(node.name) : node.name;
		}
		case "field": {
			return `${expr(node.target)}.${node.name}`;
		}
		case "index": {
			return isGrowing(node.target)
				? `${expr(node.target)}.get((int) ${expr(node.index)})`
				: `${expr(node.target)}[(int) ${expr(node.index)}]`;
		}
		case "not": {
			return `!${expr(node.operand)}`;
		}
		case "bin": {
			// `==` on Java strings compares references, which is never what the source meant.
			const isText = node.ty?.k === "string" || node.ty?.k === "enum" || node.ty?.k === "scalar";

			if (isText && (node.op === "==" || node.op === "!="))
				return `${node.op === "!=" ? "!" : ""}${expr(node.left)}.equals(${expr(node.right)})`;

			return `(${expr(node.left)} ${OPS[node.op]} ${expr(node.right)})`;
		}
		case "cond": {
			return `(${expr(node.test)} ? ${expr(node.whenTrue)} : ${expr(node.whenFalse)})`;
		}
		case "listOf": {
			if (node.of.k !== "int")
				return `new java.util.ArrayList<${type(node.of)}>(java.util.List.of(${node.items
					.map((item) => expr(item))
					.join(", ")}))`;

			// An array initializer without `new T[]` is only valid in a declaration.
			return `new long[] {${node.items.map((item) => expr(item)).join(", ")}}`;
		}
		case "struct": {
			const declared = structs.get(node.name);
			const order = declared?.fields.map((field) => field.name) ?? node.fields.map((f) => f.name);

			return `new ${node.name}(${order
				.map((name) =>
					expr(node.fields.find((field) => field.name === name)?.value ?? { k: "none" }),
				)
				.join(", ")})`;
		}
		case "optionField": {
			return `${node.target}${pascal(node.field)}`;
		}
		case "await": {
			// The blocking targets have nothing to wait on: the call has already returned.
			return expr(node.value);
		}
		case "call": {
			return call(node);
		}
	}
};

/** Whether an expression is a growing list rather than an array. */
const isGrowing = (node: Expr): boolean => {
	if (node.k !== "ref") return false;

	const ty = localTypes.get(node.name);

	return ty?.k === "list" && ty.of.k !== "int";
};

/** Renders a call. */
const call = (node: Extract<Expr, { k: "call" }>): string => {
	const args = node.args.map((argument) => expr(argument));

	if (node.callee.k === "user") return `${node.callee.name}(${args.join(", ")})`;

	switch (node.callee.name) {
		case "len": {
			return `(long) ${args[0]}.length()`;
		}
		case "listLen": {
			return isGrowing(node.args[0]) ? `(long) ${args[0]}.size()` : `(long) ${args[0]}.length`;
		}
		case "codeAt": {
			return `Runtime.codeAt(${args[0]}, ${args[1]})`;
		}
		case "slice": {
			return `Runtime.slice(${args[0]}, ${args[1]}, ${args[2]})`;
		}
		case "upper": {
			return `${args[0]}.toUpperCase(java.util.Locale.ROOT)`;
		}
		case "trim": {
			return `Runtime.jsTrim(${args[0]})`;
		}
		case "padStart": {
			return `Runtime.padStart(${args[0]}, ${args[1]}, ${args[2]})`;
		}
		case "repeat": {
			return `Runtime.repeat(${args[0]}, ${args[1]})`;
		}
		case "classHas": {
			return `Runtime.classHas(${args[0]}, ${args[1]})`;
		}
		case "keepClass": {
			return `Runtime.keepClass(${args[0]}, ${args[1]})`;
		}
		case "patternTest": {
			return `Runtime.patternTest(${args[0]}, ${args[1]})`;
		}
		case "asString": {
			// Java's types already guarantee a string at the boundary.
			return args[0];
		}
		case "isTruthy": {
			return args[0];
		}
		case "listPush": {
			return `${args[0]}.add(${args[1]})`;
		}
		case "unwrap": {
			// Java has no separate optional value to open; a reference is already nullable.
			return args[0];
		}
		case "dataAll": {
			return `Runtime.dataAll(${args[0]})`;
		}
		case "dataRows": {
			return `Runtime.dataRows(${args[0]}, ${args[1]})`;
		}
		case "isNumber": {
			// Java's parameter is a String, so the question cannot arise.
			return "false";
		}
		case "isList": {
			return "true";
		}
		case "listHas": {
			return `Runtime.listHas(${args[0]}, ${args[1]})`;
		}
		case "httpGet": {
			return `Runtime.httpGet(${args.join(", ")})`;
		}
		case "jsonString": {
			return `Runtime.jsonString(${args[0]}, ${args[1]})`;
		}
		case "jsonInt": {
			return `Runtime.jsonInt(${args[0]}, ${args[1]})`;
		}
		case "jsonTruthy": {
			return `Runtime.jsonTruthy(${args[0]}, ${args[1]})`;
		}
		case "jsonIsTrue": {
			return `Runtime.jsonIsTrue(${args[0]}, ${args[1]})`;
		}
		case "startAll": {
			return `Runtime.startAll(${className}::${node.args[0].k === "ref" ? node.args[0].name : ""}, ${args[1]}, ${args[2]})`;
		}
		case "firstSuccess": {
			return `(${type(node.ty.k === "opt" ? node.ty.of : node.ty)}) Runtime.firstSuccess(${args[0]})`;
		}
		case "anyFailedWith": {
			return `Runtime.anyFailedWith(${args[0]}, ${args[1]})`;
		}
		default: {
			throw new Error(`java: unsupported runtime call ${node.callee.name}`);
		}
	}
};

/** Renders a statement list. */
const block = (body: Stmt[], indent: string): string =>
	body
		.map((statement) => stmt(statement, indent))
		.filter((line) => line !== "")
		.join("\n");

/** Renders one statement. */
const stmt = (node: Stmt, indent: string): string => {
	switch (node.k) {
		case "let": {
			localTypes.set(node.name, node.ty);

			return `${indent}${type(node.ty)} ${node.name} = ${expr(node.value)};`;
		}
		case "assign": {
			return `${indent}${node.name} = ${expr(node.value)};`;
		}
		case "if": {
			const otherwise =
				node.otherwise.length === 0
					? ""
					: ` else {\n${block(node.otherwise, `${indent}    `)}\n${indent}}`;

			return `${indent}if (${expr(node.test)}) {\n${block(node.then, `${indent}    `)}\n${indent}}${otherwise}`;
		}
		case "return": {
			return node.value === undefined ? `${indent}return;` : `${indent}return ${expr(node.value)};`;
		}
		case "throw": {
			return `${indent}throw new ${node.error}(${expr(node.message)});`;
		}
		case "try": {
			return `${indent}try {\n${block(node.body, `${indent}    `)}\n${indent}} catch (RuntimeException ${node.catchName}) {\n${block(node.catchBody, `${indent}    `)}\n${indent}}`;
		}
		case "forRange": {
			return `${indent}for (long ${node.name} = ${expr(node.from)}; ${node.name} < ${expr(node.until)}; ${node.name}++) {\n${block(node.body, `${indent}    `)}\n${indent}}`;
		}
		case "forOf": {
			localTypes.set(node.name, node.ty);

			return `${indent}for (var ${node.name} : ${expr(node.iterable)}) {\n${block(node.body, `${indent}    `)}\n${indent}}`;
		}
		case "expr": {
			const value = node.value;

			if (value.k === "call" && value.callee.k === "std" && value.callee.name === "boundaryGuard") {
				const [subject, , fallback] = value.args;
				const name = subject.k === "ref" ? subject.name : "";

				// Java has no `typeof`, but it does have null, and a null argument would throw.
				return `${indent}if (${name} == null) {\n${indent}    return ${expr(fallback)};\n${indent}}`;
			}

			return `${indent}${expr(value)};`;
		}
	}
};

/** Renders a character class table entry. */
const charClass = (entry: CharClass): string =>
	`    private static final int[][] ${screaming(entry.name)} = {${entry.ranges.map(([from, to]) => `{0x${from.toString(16)}, 0x${to.toString(16)}}`).join(", ")}};`;

/** Renders a compiled pattern table entry. */
const pattern = (entry: PatternDecl): string =>
	`    private static final Runtime.PatternStep[] ${screaming(entry.name)} = {\n${entry.steps
		.map(
			(step) =>
				`        new Runtime.PatternStep(${screaming(step.charClass)}, ${step.min}, ${step.max}, ${step.capture}),`,
		)
		.join("\n")}\n    };`;

/** Renders an options record. */
const struct = (entry: StructDecl): string => {
	const fields = entry.fields
		.map(
			(field) =>
				`${field.doc === "" ? "" : `    /** ${field.doc} */\n`}    public ${entry.isOptions ? boxed(field.ty) : type(field.ty)} ${field.name};`,
		)
		.join("\n\n");
	// An options record is filled in field by field; a value record is built in one go.
	const constructor = entry.isOptions
		? ""
		: `\n\n    public ${entry.name}(${entry.fields
				.map((field) => `${type(field.ty)} ${field.name}`)
				.join(", ")}) {\n${entry.fields
				.map((field) => `        this.${field.name} = ${field.name};`)
				.join("\n")}\n    }`;

	return `/** ${entry.doc} */
public final class ${entry.name} {
${fields}${constructor}
}`;
};

/** Renders an error type. Java has real inheritance, so the hierarchy is the declaration. */
const error = (entry: ErrorDecl): string =>
	`/** ${entry.doc === "" ? entry.name : entry.doc} */
public class ${entry.name} extends ${entry.base ?? "RuntimeException"} {
    public ${entry.name}(String message) {
        super(message);
    }
}`;

/** Renders a dataset as the tables the runtime materialises, chunked to stay under Java's
 * 64 KiB per method limit. */
const data = (entry: DataDecl): string => {
	const name = entry.name.toLowerCase();
	const rowChunks = chunks(
		entry.rows.map(
			(row, index) =>
				`        rows[${index}] = new String[] {${row.map((cell) => lit(cell)).join(", ")}};`,
		),
		200,
	);
	const orderChunks = chunks(
		entry.fullOrder.map((value, index) => `        order[${index}] = ${value};`),
		500,
	);
	const keys = Object.keys(entry.groups);
	const groupChunks = chunks(
		keys.map(
			(key, index) => `        groups[${index}] = new int[] {${entry.groups[key].join(", ")}};`,
		),
		5,
	);

	return `    /** ${entry.doc} */
    private static final Runtime.Dataset ${screaming(entry.name)} = new Runtime.Dataset(
        ${name}Rows(), new String[] {${keys.map((key) => lit(key)).join(", ")}}, ${name}Groups(), ${name}Order());

    private static String[][] ${name}Rows() {
        String[][] rows = new String[${entry.rows.length}][];
${rowChunks.map((_, index) => `        ${name}Rows${index}(rows);`).join("\n")}
        return rows;
    }

${rowChunks
	.map(
		(chunk, index) =>
			`    private static void ${name}Rows${index}(String[][] rows) {\n${chunk.join("\n")}\n    }`,
	)
	.join("\n\n")}

    private static int[][] ${name}Groups() {
        int[][] groups = new int[${keys.length}][];
${groupChunks.map((_, index) => `        ${name}Groups${index}(groups);`).join("\n")}
        return groups;
    }

${groupChunks
	.map(
		(chunk, index) =>
			`    private static void ${name}Groups${index}(int[][] groups) {\n${chunk.join("\n")}\n    }`,
	)
	.join("\n\n")}

    private static int[] ${name}Order() {
        int[] order = new int[${entry.fullOrder.length}];
${orderChunks.map((_, index) => `        ${name}Order${index}(order);`).join("\n")}
        return order;
    }

${orderChunks
	.map(
		(chunk, index) =>
			`    private static void ${name}Order${index}(int[] order) {\n${chunk.join("\n")}\n    }`,
	)
	.join("\n\n")}`;
};

/** Renders one function. */
const func = (entry: FuncDecl): string => {
	localTypes = new Map(entry.params.map((param) => [param.name, param.ty]));

	const params = entry.params
		.map((param) => `${type(param.ty.k === "opt" ? param.ty.of : param.ty)} ${param.name}`)
		.join(", ");
	const prologue = optionReads(entry)
		.map((read) => {
			const local = `${read.target}${pascal(read.field)}`;
			const ty = read.expr.k === "optionField" ? read.expr.ty : ({ k: "int" } as Ty);
			const fallback = read.expr.k === "optionField" ? expr(read.expr.fallback) : "null";
			const declared = ty.k === "bool" ? "boolean" : ty.k === "int" ? "long" : type(ty);

			localTypes.set(local, ty);

			return `        ${declared} ${local} = ${fallback};\n        if (${read.target} != null && ${read.target}.${read.field} != null) {\n            ${local} = ${read.target}.${read.field};\n        }`;
		})
		.join("\n");
	const doc = prose(entry.doc);
	const comment =
		doc === ""
			? ""
			: `    /**\n${doc
					.split("\n")
					.map((line) => `     * ${line}`.trimEnd())
					.join("\n")}\n     */\n`;

	return `${comment}    public static ${type(entry.ret)} ${entry.name}(${params}) {
${prologue === "" ? "" : `${prologue}\n`}${block(entry.body, "        ")}
    }`;
};

/**
 * Emits the Java target of one module.
 *
 * @param {Module} module - The compiled module.
 * @returns {Record<string, string>} The files, by path.
 */
export const emit = (module: Module): Record<string, string> => {
	structs = new Map(module.structs.map((entry) => [entry.name, entry]));
	external = new Set(
		module.structs.filter((entry) => entry.external === true).map((entry) => entry.name),
	);
	className = pascal(module.name);
	verbatim = new Set([
		...module.charClasses.map((entry) => entry.name),
		...module.patterns.map((entry) => entry.name),
		...module.constants.map((entry) => entry.name),
		...module.data.map((entry) => entry.name),
	]);

	const constants = module.constants
		.map(
			(entry) =>
				`    private static final ${type(entry.ty)} ${screaming(entry.name)} = ${expr(entry.expr)};`,
		)
		.join("\n");

	const files: Record<string, string> = {
		"Runtime.java": readFileSync(RUNTIME, "utf8"),
		[`${className}.java`]: `// Code generated from spec/bridge/source/${module.name}.ts. DO NOT EDIT.

/** ${module.doc} */
public final class ${className} {
    private ${className}() {}

${module.charClasses.map((entry) => charClass(entry)).join("\n")}

${module.patterns.map((entry) => pattern(entry)).join("\n\n")}

${constants}

${module.data.map((entry) => data(entry)).join("\n\n")}

${module.functions.map((entry) => func(entry)).join("\n\n")}
}
`,
	};

	for (const entry of module.structs) {
		if (entry.external === true) continue;

		files[`${entry.name}.java`] = `${struct(entry)}\n`;
	}

	for (const entry of module.errors) files[`${entry.name}.java`] = `${error(entry)}\n`;

	return files;
};
