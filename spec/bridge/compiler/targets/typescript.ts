/**
 * The TypeScript emitter.
 *
 * Its output has to drop into `src/` and pass the package's own test suite, so it follows the
 * repository's conventions: arrow functions, tabs, JSDoc with the `@see` lines carried over
 * from the source, and the literal option types the type level tests assert on.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
	CharClass,
	DataDecl,
	EnumDecl,
	Expr,
	FuncDecl,
	Module,
	PatternDecl,
	Stmt,
	StructDecl,
	Ty,
} from "../ir.ts";

/** The record types of the module being emitted, for the field level casts. */
let structs = new Map<string, StructDecl>();

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
		case "string":
			return "string";
		case "int":
			return "number";
		case "bool":
			return "boolean";
		case "void":
			return "void";
		case "json":
			return "unknown";
		case "scalar":
			return "string | number";
		case "enum":
			return ty.name;
		case "list":
			return `${type(ty.of)}[]`;
		case "opt":
			return `${type(ty.of)} | undefined`;
		case "named":
			return ty.name;
	}
};

/**
 * Renders an expression.
 *
 * @param {Expr} expr - The expression.
 * @returns {string} The TypeScript expression.
 */
const expr = (expr_: Expr): string => {
	switch (expr_.k) {
		case "str":
			return lit(expr_.value);
		case "int":
			return String(expr_.value);
		case "bool":
			return String(expr_.value);
		case "none":
			return "undefined";
		case "ref":
			return expr_.name;
		case "field":
			return `${expr(expr_.target)}.${expr_.name}`;
		case "index":
			return `${expr(expr_.target)}[${expr(expr_.index)}]`;
		case "not":
			return `!${expr(expr_.operand)}`;
		case "bin":
			return `(${expr(expr_.left)} ${expr_.op === "==" ? "===" : expr_.op === "!=" ? "!==" : expr_.op} ${expr(expr_.right)})`;
		case "cond":
			return `(${expr(expr_.test)} ? ${expr(expr_.whenTrue)} : ${expr(expr_.whenFalse)})`;
		case "listOf":
			return `[${expr_.items.map((item) => expr(item)).join(", ")}]`;
		case "struct": {
			const declared = structs.get(expr_.name);

			return `{ ${expr_.fields
				.map((field) => {
					const ty = declared?.fields.find((candidate) => candidate.name === field.name)?.ty;
					// A dataset holds plain strings; the closed set is the declaration's promise, and
					// `data/build.ts` is what keeps it true.
					const cast = ty?.k === "enum" && field.value.k !== "str" ? ` as ${ty.name}` : "";

					return `${field.name}: ${expr(field.value)}${cast}`;
				})
				.join(", ")} }`;
		}
		case "await":
			return `await ${expr(expr_.value)}`;
		case "optionField":
			return `${expr_.target}?.${expr_.field}`;
		case "call":
			return call(expr_);
		default:
			throw new Error(`typescript: unsupported expression ${expr_.k}`);
	}
};

/** Renders a call, mapping the runtime helpers onto TypeScript's own string methods. */
const call = (node: Extract<Expr, { k: "call" }>): string => {
	const args = node.args.map((argument) => expr(argument));

	if (node.callee.k === "user") return `${node.callee.name}(${args.join(", ")})`;

	switch (node.callee.name) {
		case "len":
			return `${args[0]}.length`;
		case "listLen":
			return `${args[0]}.length`;
		case "codeAt":
			return `codeAt(${args[0]}, ${args[1]})`;
		case "slice":
			return `${args[0]}.slice(${args[1]}, ${args[2]})`;
		case "upper":
			return `${args[0]}.toUpperCase()`;
		case "trim":
			return `${args[0]}.trim()`;
		case "padStart":
			return `padStart(${args[0]}, ${args[1]}, ${args[2]})`;
		case "repeat":
			return `${args[0]}.repeat(${args[1]})`;
		case "classHas":
			return `classHas(${args[0]}, ${args[1]})`;
		case "keepClass":
			return `keepClass(${args[0]}, ${args[1]})`;
		case "patternTest":
			return `patternTest(${args[0]}, ${args[1]})`;
		case "asString":
			return `asString(${args[0]})`;
		case "isTruthy":
			return `isTruthy(${args[0]})`;
		case "listPush":
			return `${args[0]}.push(${args[1]})`;
		case "unwrap":
			// TypeScript's own narrowing has already done this.
			return args[0];
		case "dataAll":
			return `dataAll(${args[0]})`;
		case "dataRows":
			return `dataRows(${args[0]}, ${args[1]})`;
		default:
			throw new Error(`typescript: unsupported runtime call ${node.callee.name}`);
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
		case "assign":
			return `${indent}${node.name} = ${expr(node.value)};`;
		case "if": {
			const otherwise =
				node.otherwise.length === 0
					? ""
					: ` else {\n${block(node.otherwise, `${indent}\t`)}\n${indent}}`;

			return `${indent}if (${expr(node.test)}) {\n${block(node.then, `${indent}\t`)}\n${indent}}${otherwise}`;
		}
		case "return":
			return node.value === undefined ? `${indent}return;` : `${indent}return ${expr(node.value)};`;
		case "forRange":
			return `${indent}for (let ${node.name} = ${expr(node.from)}; ${node.name} < ${expr(node.until)}; ${node.name}++) {\n${block(node.body, `${indent}\t`)}\n${indent}}`;
		case "forOf":
			return `${indent}for (const ${node.name} of ${expr(node.iterable)}) {\n${block(node.body, `${indent}\t`)}\n${indent}}`;
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
		default:
			throw new Error(`typescript: unsupported statement ${node.k}`);
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

/** Renders a closed set of strings. */
const enumeration = (entry: EnumDecl): string =>
	`${entry.doc === "" ? "" : `/**\n${entry.doc
		.split("\n")
		.map((line) => ` * ${line}`.trimEnd())
		.join("\n")}\n */\n`}export type ${entry.name} =\n${entry.values
		.map((value) => `\t| ${lit(value)}`)
		.join("\n")};`;

/** Renders a dataset as the table the runtime materialises. */
const data = (entry: DataDecl): string => {
	const rows = entry.rows.map((row) => `\t\t[${row.map((cell) => lit(cell)).join(", ")}],`).join("\n");
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
	const doc = entry.doc === "" ? "" : `/**\n${entry.doc.split("\n").map((line) => ` * ${line}`.trimEnd()).join("\n")}\n */\n`;
	const signature = `(${params}): ${entry.isAsync ? `Promise<${type(entry.ret)}>` : type(entry.ret)}`;

	return `${doc}${entry.exported ? "export " : ""}const ${entry.name} = ${entry.isAsync ? "async " : ""}${signature} => {\n${block(entry.body, "\t")}\n};`;
};

/**
 * Emits the TypeScript target of one module.
 *
 * @param {Module} module - The compiled module.
 * @returns {Record<string, string>} The files, by path.
 */
export const emit = (module: Module): Record<string, string> => {
	structs = new Map(module.structs.map((entry) => [entry.name, entry]));

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
	]) {
		if (new RegExp(`\\b${helper}\\(`).test(rendered)) used.add(helper);
	}

	if (module.charClasses.length > 0) used.add("type CharClass");
	if (module.patterns.length > 0) used.add("type PatternStep");
	if (module.data.length > 0) used.add("makeDataset");

	const imports = [...used].sort();
	const constants = module.constants
		.map((entry) => `const ${entry.name} = ${expr(entry.expr)};`)
		.join("\n");

	// One file per exported function, in the layout `src/` uses, re-exporting the module. The
	// package's own tests import these paths, so the generated code drops straight in.
	const shims: Record<string, string> = {};

	for (const entry of module.functions) {
		if (!entry.exported) continue;

		const kebab = entry.name.replaceAll(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
		const types = [
			...module.structs.map((candidate) => candidate.name),
			...module.enums.map((candidate) => candidate.name),
		];
		const exports = [entry.name, ...types.map((name) => `type ${name}`)].join(", ");

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

${module.structs.map((entry) => struct(entry)).join("\n\n")}

${module.data.map((entry) => data(entry)).join("\n\n")}

${rendered}
`,
	};
};
