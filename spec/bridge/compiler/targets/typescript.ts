/**
 * The TypeScript emitter.
 *
 * Its output has to drop into `src/` and pass the package's own test suite, so it follows the
 * repository's conventions: arrow functions, tabs, JSDoc with the `@see` lines carried over
 * from the source, and the literal option types the type level tests assert on.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
	type CharClass,
	type DataDecl,
	type EnumDecl,
	type ErrorDecl,
	type Expr,
	type FuncDecl,
	type Module,
	type PatternDecl,
	type Stmt,
	type StructDecl,
	type Ty,
} from "../ir.ts";
import { optionReads, pascal } from "../kit.ts";

/** The record types of the module being emitted, for the field level casts. */
let structs = new Map<string, StructDecl>();

/** The functions that wait on the network, and are therefore `async` here. */
let blocking = new Set<string>();

const RUNTIME = resolve(import.meta.dirname, "../runtime/typescript.ts");

/**
 * Renders a string as a TypeScript literal.
 *
 * @param {string} value - The text.
 * @returns {string} The literal.
 */
const lit = (value: string): string => {
	let out = '"';

	for (const char of value) {
		const code = char.codePointAt(0) ?? 0;

		if (char === '"') out += String.raw`\"`;
		else if (char === "\\") out += String.raw`\\`;
		else if (code < 0x20 || code > 0x7e) out += `\\u{${code.toString(16)}}`;
		else out += char;
	}

	return `${out}"`;
};

/**
 * Renders an IR type.
 *
 * @param {Ty} ty - The type.
 * @returns {string} The TypeScript type.
 */
const type = (ty: Ty): string => {
	switch (ty.k) {
		case "string": {
			return "string";
		}
		case "int": {
			return "number";
		}
		case "bool": {
			return "boolean";
		}
		case "void": {
			return "void";
		}
		case "json": {
			return "unknown";
		}
		case "scalar": {
			return "string | number";
		}
		case "enum": {
			return ty.name;
		}
		case "tasks": {
			return `Attempts<${type(ty.of)}>`;
		}
		case "list": {
			return `${type(ty.of)}[]`;
		}
		case "opt": {
			return `${type(ty.of)} | undefined`;
		}
		case "named": {
			return ty.name;
		}
	}
};

/**
 * Renders an expression.
 *
 * @param {Expr} expr - The expression.
 * @returns {string} The TypeScript expression.
 */
const expr = (node: Expr): string => {
	switch (node.k) {
		case "str": {
			return lit(node.value);
		}
		case "int": {
			return String(node.value);
		}
		case "bool": {
			return String(node.value);
		}
		case "none": {
			return "undefined";
		}
		case "ref": {
			return node.name;
		}
		case "field": {
			return `${expr(node.target)}.${node.name}`;
		}
		case "index": {
			return `${expr(node.target)}[${expr(node.index)}]`;
		}
		case "not": {
			return `!${expr(node.operand)}`;
		}
		case "bin": {
			return `(${expr(node.left)} ${node.op === "==" ? "===" : node.op === "!=" ? "!==" : node.op} ${expr(node.right)})`;
		}
		case "cond": {
			return `(${expr(node.test)} ? ${expr(node.whenTrue)} : ${expr(node.whenFalse)})`;
		}
		case "listOf": {
			return `[${node.items.map((item) => expr(item)).join(", ")}]`;
		}
		case "struct": {
			const declared = structs.get(node.name);

			return `{ ${node.fields
				.map((field) => {
					const ty = declared?.fields.find((candidate) => candidate.name === field.name)?.ty;
					// A dataset holds plain strings; the closed set is the declaration's promise, and
					// `data/build.ts` is what keeps it true.
					const cast = ty?.k === "enum" && field.value.k !== "str" ? ` as ${ty.name}` : "";

					return `${field.name}: ${expr(field.value)}${cast}`;
				})
				.join(", ")} }`;
		}
		case "await": {
			return `await ${expr(node.value)}`;
		}
		case "optionField": {
			// The prologue binds every option read to a local of this name.
			return `${node.target}${pascal(node.field)}`;
		}
		case "call": {
			return call(node);
		}
	}
};

/** Renders a call, mapping the runtime helpers onto TypeScript's own string methods. */
const call = (node: Extract<Expr, { k: "call" }>): string => {
	const args = node.args.map((argument) => expr(argument));

	if (node.callee.k === "user")
		return `${blocking.has(node.callee.name) ? "await " : ""}${node.callee.name}(${args.join(", ")})`;

	switch (node.callee.name) {
		case "len": {
			return `${args[0]}.length`;
		}
		case "listLen": {
			return `${args[0]}.length`;
		}
		case "codeAt": {
			return `codeAt(${args[0]}, ${args[1]})`;
		}
		case "slice": {
			return `${args[0]}.slice(${args[1]}, ${args[2]})`;
		}
		case "upper": {
			return `${args[0]}.toUpperCase()`;
		}
		case "trim": {
			return `${args[0]}.trim()`;
		}
		case "padStart": {
			return `padStart(${args[0]}, ${args[1]}, ${args[2]})`;
		}
		case "repeat": {
			return `${args[0]}.repeat(${args[1]})`;
		}
		case "classHas": {
			return `classHas(${args[0]}, ${args[1]})`;
		}
		case "keepClass": {
			return `keepClass(${args[0]}, ${args[1]})`;
		}
		case "patternTest": {
			return `patternTest(${args[0]}, ${args[1]})`;
		}
		case "asString": {
			return `asString(${args[0]})`;
		}
		case "isTruthy": {
			return `isTruthy(${args[0]})`;
		}
		case "listPush": {
			return `${args[0]}.push(${args[1]})`;
		}
		case "unwrap": {
			// TypeScript's own narrowing has already done this.
			return args[0];
		}
		case "dataAll": {
			return `dataAll(${args[0]})`;
		}
		case "dataRows": {
			return `dataRows(${args[0]}, ${args[1]})`;
		}
		case "isNumber": {
			return `isNumber(${args[0]})`;
		}
		case "isList": {
			return `isList(${args[0]})`;
		}
		case "listHas": {
			return `listHas(${args[0]}, ${args[1]})`;
		}
		case "httpGet": {
			return `await httpGet(${args.join(", ")})`;
		}
		case "jsonString": {
			return `jsonString(${args[0]}, ${args[1]})`;
		}
		case "jsonInt": {
			return `jsonInt(${args[0]}, ${args[1]})`;
		}
		case "jsonTruthy": {
			return `jsonTruthy(${args[0]}, ${args[1]})`;
		}
		case "jsonIsTrue": {
			return `jsonIsTrue(${args[0]}, ${args[1]})`;
		}
		case "startAll": {
			return `startAll(${args.join(", ")})`;
		}
		case "firstSuccess": {
			return `await firstSuccess(${args[0]})`;
		}
		case "anyFailedWith": {
			return `anyFailedWith(${args[0]}, ${args[1]})`;
		}
		default: {
			throw new Error(`typescript: unsupported runtime call ${node.callee.name}`);
		}
	}
};

/**
 * Renders a statement list.
 *
 * @param {Stmt[]} body - The statements.
 * @param {string} indent - The current indentation.
 * @returns {string} The rendered block.
 */
const block = (body: Stmt[], indent: string): string =>
	body
		.map((statement) => stmt(statement, indent))
		.filter((rendered) => rendered !== "")
		.join("\n");

/** Renders one statement. */
const stmt = (node: Stmt, indent: string): string => {
	switch (node.k) {
		case "let": {
			// An empty literal says nothing about what it holds, so the declaration has to.
			const annotation =
				node.value.k === "listOf" && node.value.items.length === 0 ? `: ${type(node.ty)}` : "";

			return `${indent}${node.mutable ? "let" : "const"} ${node.name}${annotation} = ${expr(node.value)};`;
		}
		case "assign": {
			return `${indent}${node.name} = ${expr(node.value)};`;
		}
		case "if": {
			const otherwise =
				node.otherwise.length === 0
					? ""
					: ` else {\n${block(node.otherwise, `${indent}\t`)}\n${indent}}`;

			return `${indent}if (${expr(node.test)}) {\n${block(node.then, `${indent}\t`)}\n${indent}}${otherwise}`;
		}
		case "return": {
			return node.value === undefined ? `${indent}return;` : `${indent}return ${expr(node.value)};`;
		}
		case "throw": {
			return `${indent}throw new ${node.error}(${expr(node.message)});`;
		}
		case "try": {
			return `${indent}try {\n${block(node.body, `${indent}\t`)}\n${indent}} catch (${node.catchName}) {\n${block(node.catchBody, `${indent}\t`)}\n${indent}}`;
		}
		case "forRange": {
			return `${indent}for (let ${node.name} = ${expr(node.from)}; ${node.name} < ${expr(node.until)}; ${node.name}++) {\n${block(node.body, `${indent}\t`)}\n${indent}}`;
		}
		case "forOf": {
			return `${indent}for (const ${node.name} of ${expr(node.iterable)}) {\n${block(node.body, `${indent}\t`)}\n${indent}}`;
		}
		case "expr": {
			const value = node.value;

			if (value.k === "call" && value.callee.k === "std" && value.callee.name === "boundaryGuard") {
				const [subject, kind, fallback] = value.args;
				const name = subject.k === "ref" ? subject.name : "";
				const test =
					kind.k === "str" && kind.value === "string"
						? `typeof ${name} !== "string"`
						: `${name} === null || ${name} === undefined`;

				return `${indent}if (${test}) {\n${indent}\treturn ${expr(fallback)};\n${indent}}`;
			}

			return `${indent}${expr(value)};`;
		}
	}
};

/** Renders a character class table entry. */
const charClass = (entry: CharClass): string =>
	`const ${entry.name}: CharClass = [${entry.ranges.map(([from, to]) => `[0x${from.toString(16)}, 0x${to.toString(16)}]`).join(", ")}];`;

/** Renders a compiled pattern table entry. */
const pattern = (entry: PatternDecl): string =>
	`const ${entry.name}: readonly PatternStep[] = [\n${entry.steps
		.map(
			(step) =>
				`\t{ charClass: ${step.charClass}, min: ${step.min}, max: ${step.max}, capture: ${step.capture} },`,
		)
		.join("\n")}\n];`;

/** Renders an error type, with the `name` its own tests assert on. */
const error = (entry: ErrorDecl): string =>
	`${entry.doc === "" ? "" : `/** ${entry.doc.split("\n").join(" ")} */\n`}${entry.exported ? "export " : ""}class ${entry.name} extends ${entry.base ?? "Error"} {
\tpublic constructor(message: string) {
\t\tsuper(message);
\t\tthis.name = ${lit(entry.name)};
\t}
}`;

/** Renders a closed set of strings. */
const enumeration = (entry: EnumDecl): string =>
	`${
		entry.doc === ""
			? ""
			: `/**\n${entry.doc
					.split("\n")
					.map((line) => ` * ${line}`.trimEnd())
					.join("\n")}\n */\n`
	}export type ${entry.name} =\n${entry.values.map((value) => `\t| ${lit(value)}`).join("\n")};`;

/** Renders a dataset as the table the runtime materialises. */
const data = (entry: DataDecl): string => {
	const rows = entry.rows
		.map((row) => `\t\t[${row.map((cell) => lit(cell)).join(", ")}],`)
		.join("\n");
	const groups = Object.entries(entry.groups)
		.map(([key, indexes]) => `\t\t[${lit(key)}, [${indexes.join(", ")}]],`)
		.join("\n");

	return `/** ${entry.doc} */
const ${entry.name} = makeDataset(
\t[
${rows}
\t],
\t[
${groups}
\t],
\t[${entry.fullOrder.join(", ")}],
);`;
};

/** Renders an options or record type. */
const struct = (entry: StructDecl): string => {
	const fields = entry.fields
		.map((field) => {
			const domain = field.domain === undefined ? type(field.ty) : field.domain.join(" | ");

			return `${field.doc === "" ? "" : `\t/** ${field.doc} */\n`}\t${field.name}${entry.isOptions ? "?" : ""}: ${domain};`;
		})
		.join("\n");

	return `${entry.doc === "" ? "" : `/** ${entry.doc} */\n`}export type ${entry.name} = {\n${fields}\n};`;
};

/** Renders one function, documentation included. */
const func = (entry: FuncDecl): string => {
	const params = entry.params
		.map((param) => {
			// `stateCode?: StateCode` already says "or undefined"; spelling it twice is noise.
			const declared = param.optional && param.ty.k === "opt" ? param.ty.of : param.ty;

			return `${param.name}${param.optional ? "?" : ""}: ${type(declared)}`;
		})
		.join(", ");
	const prologue = optionReads(entry)
		.map((read) => {
			const fallback = read.expr.k === "optionField" ? read.expr.fallback : { k: "none" as const };
			const otherwise = fallback.k === "none" ? "" : ` ?? ${expr(fallback)}`;

			return `\tconst ${read.local} = ${read.target}?.${read.field}${otherwise};`;
		})
		.join("\n");
	const doc =
		entry.doc === ""
			? ""
			: `/**\n${entry.doc
					.split("\n")
					.map((line) => ` * ${line}`.trimEnd())
					.join("\n")}\n */\n`;
	// A function that waits on the network is `async` here even though the source is written
	// straight-line: colouring the call graph is the emitter's job, not the author's.
	const isAsync = entry.isAsync || entry.blocking;
	const signature = `(${params}): ${isAsync ? `Promise<${type(entry.ret)}>` : type(entry.ret)}`;

	return `${doc}${entry.exported ? "export " : ""}const ${entry.name} = ${isAsync ? "async " : ""}${signature} => {\n${prologue === "" ? "" : `${prologue}\n`}${block(entry.body, "\t")}\n};`;
};

/**
 * Emits the TypeScript target of one module.
 *
 * @param {Module} module - The compiled module.
 * @returns {Record<string, string>} The files, by path.
 */
export const emit = (module: Module): Record<string, string> => {
	structs = new Map(module.structs.map((entry) => [entry.name, entry]));
	blocking = new Set(module.functions.filter((entry) => entry.blocking).map((entry) => entry.name));

	const used = new Set<string>();
	const rendered = module.functions.map((entry) => func(entry)).join("\n\n");

	for (const helper of [
		"codeAt",
		"classHas",
		"keepClass",
		"patternTest",
		"padStart",
		"asString",
		"isTruthy",
		"dataAll",
		"dataRows",
		"isNumber",
		"isList",
		"listHas",
		"httpGet",
		"jsonString",
		"jsonInt",
		"jsonTruthy",
		"jsonIsTrue",
		"startAll",
		"firstSuccess",
		"anyFailedWith",
	]) {
		if (new RegExp(`\\b${helper}\\(`).test(rendered)) used.add(helper);
	}

	if (module.charClasses.length > 0) used.add("type CharClass");
	if (module.patterns.length > 0) used.add("type PatternStep");
	if (module.data.length > 0) used.add("makeDataset");
	if (used.has("startAll")) used.add("type Attempts");

	const imports = [...used].sort();
	const constants = module.constants
		.map((entry) =>
			entry.ty.k === "list" && entry.ty.of.k === "enum"
				? `const ${entry.name}: ${type(entry.ty)} = ${expr(entry.expr)};`
				: `const ${entry.name} = ${expr(entry.expr)};`,
		)
		.join("\n");

	// One file per exported function, in the layout `src/` uses, re-exporting the module. The
	// package's own tests import these paths, so the generated code drops straight in.
	const shims: Record<string, string> = {};

	for (const entry of module.functions) {
		if (!entry.exported) continue;

		const kebab = entry.name.replaceAll(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
		const types = [
			...module.structs.filter((candidate) => candidate.external !== true),
			...module.enums,
		].map((candidate) => `type ${candidate.name}`);
		const errors = module.errors
			.filter((candidate) => candidate.exported)
			.map((candidate) => candidate.name);
		const exports = [entry.name, ...errors, ...types].join(", ");

		shims[`${kebab}/${kebab}.ts`] =
			`// Code generated from spec/bridge/source/${module.name}.ts. DO NOT EDIT.\nexport { ${exports} } from "../_bridge/${module.name}";\n`;
	}

	return {
		...shims,
		"_bridge/_runtime.ts": readFileSync(RUNTIME, "utf8"),
		[`_bridge/${module.name}.ts`]: `// Code generated from spec/bridge/source/${module.name}.ts. DO NOT EDIT.
${module.doc === "" ? "" : `\n/** ${module.doc} */\n`}
import { ${imports.join(", ")} } from "./_runtime.ts";

${module.charClasses.map((entry) => charClass(entry)).join("\n")}

${module.patterns.map((entry) => pattern(entry)).join("\n\n")}

${constants}

${module.enums.map((entry) => enumeration(entry)).join("\n\n")}

${module.errors.map((entry) => error(entry)).join("\n\n")}

${module.structs
	.filter((entry) => entry.external !== true)
	.map((entry) => struct(entry))
	.join("\n\n")}

${module.data.map((entry) => data(entry)).join("\n\n")}

${rendered}
`,
	};
};
