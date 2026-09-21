/**
 * The Go emitter.
 *
 * Exported names in Go's style, options as a pointer to a struct of pointers so that "unset"
 * and "set to zero" stay distinguishable, and the option reads hoisted into locals by the
 * prologue.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
	CharClass,
	DataDecl,
	Expr,
	FuncDecl,
	Module,
	PatternDecl,
	Stmt,
	StructDecl,
	Ty,
} from "../ir.ts";
import { optionReads, pascal, prose, screaming } from "../kit.ts";

const RUNTIME = resolve(import.meta.dirname, "../runtime/go.go");

/** Module level names the emitter writes verbatim. */
let verbatim = new Set<string>();

/** Renders a string as a Go literal. */
const lit = (value: string): string => {
	let out = '"';

	for (const char of value) {
		const code = char.codePointAt(0) ?? 0;

		if (char === '"') out += String.raw`\"`;
		else if (char === "\\") out += String.raw`\\`;
		else if (code > 0xff_ff) out += `\\U${code.toString(16).padStart(8, "0")}`;
		else if (code < 0x20 || code > 0x7e) out += `\\u${code.toString(16).padStart(4, "0")}`;
		else out += char;
	}

	return `${out}"`;
};

/** Renders an IR type. */
const type = (ty: Ty): string => {
	switch (ty.k) {
		case "string":
		case "scalar":
		case "enum":
			return "string";
		case "int":
			return "int64";
		case "bool":
			return "bool";
		case "void":
			return "";
		case "json":
			return "any";
		case "list":
			return `[]${type(ty.of)}`;
		case "opt":
			return `*${type(ty.of)}`;
		case "named":
			return `*${ty.name}`;
	}
};

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
		case "str":
			return lit(node.value);
		case "int":
			return String(node.value);
		case "bool":
			return String(node.value);
		case "none":
			return "nil";
		case "ref":
			return verbatim.has(node.name) ? node.name : node.name;
		case "field":
			return `${expr(node.target)}.${pascal(node.name)}`;
		case "index":
			return `${expr(node.target)}[${expr(node.index)}]`;
		case "not":
			return `!${expr(node.operand)}`;
		case "bin":
			return `(${expr(node.left)} ${OPS[node.op]} ${expr(node.right)})`;
		case "cond":
			throw new Error("go: the ternary operator has no Go form; use an if statement");
		case "listOf":
			return `[]${type(node.of)}{${node.items.map((item) => expr(item)).join(", ")}}`;
		case "struct":
			return `&${node.name}{${node.fields
				.map((field) => `${pascal(field.name)}: ${expr(field.value)}`)
				.join(", ")}}`;
		case "optionField":
			return `${node.target}${pascal(node.field)}`;
		case "call":
			return call(node);
		default:
			throw new Error(`go: unsupported expression ${node.k}`);
	}
};

/** Renders a call. */
const call = (node: Extract<Expr, { k: "call" }>): string => {
	const args = node.args.map((argument) => expr(argument));

	if (node.callee.k === "user") return `${node.callee.name}(${args.join(", ")})`;

	switch (node.callee.name) {
		case "len":
			return `int64(runtime.Len(${args[0]}))`;
		case "listLen":
			return `int64(len(${args[0]}))`;
		case "codeAt":
			return `int64(runtime.CodeAt(${args[0]}, int(${args[1]})))`;
		case "slice":
			return `runtime.Slice(${args[0]}, int(${args[1]}), int(${args[2]}))`;
		case "upper":
			return `runtime.Upper(${args[0]})`;
		case "trim":
			return `runtime.JsTrim(${args[0]})`;
		case "padStart":
			return `runtime.PadStart(${args[0]}, int(${args[1]}), ${args[2]})`;
		case "repeat":
			return `runtime.Repeat(${args[0]}, int(${args[1]}))`;
		case "classHas":
			return `runtime.ClassHas(${args[0]}, ${args[1]})`;
		case "keepClass":
			return `runtime.KeepClass(${args[0]}, ${args[1]})`;
		case "patternTest":
			return `runtime.PatternTest(${args[0]}, ${args[1]})`;
		case "asString":
			// Go's type system already guarantees a string at the boundary.
			return args[0];
		case "isTruthy":
			return args[0];
		case "listPush":
			// `append` returns a new slice, so a push is an assignment; it is only ever a statement.
			return `${args[0]} = append(${args[0]}, ${args[1]})`;
		case "unwrap":
			return `*${args[0]}`;
		case "dataAll":
			return `runtime.DataAll(${args[0]})`;
		case "dataRows":
			return `runtime.DataRows(${args[0]}, ${args[1]})`;
		default:
			throw new Error(`go: unsupported runtime call ${node.callee.name}`);
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
		case "let":
			// Integers are int64 throughout, so they are declared rather than inferred: `:=` on a
			// literal would make an `int` that will not compare against the rest.
			return node.ty.k === "int"
				? `${indent}var ${node.name} int64 = ${expr(node.value)}`
				: `${indent}${node.name} := ${expr(node.value)}`;
		case "assign":
			return `${indent}${node.name} = ${expr(node.value)}`;
		case "if": {
			const otherwise =
				node.otherwise.length === 0 ? "" : ` else {\n${block(node.otherwise, `${indent}\t`)}\n${indent}}`;

			return `${indent}if ${expr(node.test)} {\n${block(node.then, `${indent}\t`)}\n${indent}}${otherwise}`;
		}
		case "return":
			return node.value === undefined ? `${indent}return` : `${indent}return ${expr(node.value)}`;
		case "forRange":
			return `${indent}for ${node.name} := int64(${expr(node.from)}); ${node.name} < ${expr(node.until)}; ${node.name}++ {\n${block(node.body, `${indent}\t`)}\n${indent}}`;
		case "forOf":
			return `${indent}for _, ${node.name} := range ${expr(node.iterable)} {\n${block(node.body, `${indent}\t`)}\n${indent}}`;
		case "expr": {
			const value = node.value;

			// Go's types make the boundary guards unnecessary, except for the nullish one on a
			// value that is a string here rather than a union.
			if (value.k === "call" && value.callee.k === "std" && value.callee.name === "boundaryGuard")
				return "";

			return `${indent}${expr(value)}`;
		}
		default:
			throw new Error(`go: unsupported statement ${node.k}`);
	}
};

/** Renders a character class table entry. */
const charClass = (entry: CharClass): string =>
	`var ${entry.name} = runtime.CharClass{${entry.ranges.map(([from, to]) => `{0x${from.toString(16)}, 0x${to.toString(16)}}`).join(", ")}}`;

/** Renders a compiled pattern table entry. */
const pattern = (entry: PatternDecl): string =>
	`var ${entry.name} = []runtime.PatternStep{\n${entry.steps
		.map(
			(step) =>
				`\t{Class: ${step.charClass}, Min: ${step.min}, Max: ${step.max}, Capture: ${step.capture}},`,
		)
		.join("\n")}\n}`;

/** Renders an options record. */
const struct = (entry: StructDecl): string => {
	const fields = entry.fields
		.map(
			(field) =>
				`${field.doc === "" ? "" : `\t// ${field.doc}\n`}\t${pascal(field.name)} ${entry.isOptions ? "*" : ""}${type(field.ty)}`,
		)
		.join("\n");

	return `// ${entry.name} ${entry.doc}
type ${entry.name} struct {
${fields}
}`;
};

/** Renders a dataset as the table the runtime materialises. */
const data = (entry: DataDecl): string => {
	const rows = entry.rows
		.map((row) => `\t{${row.map((cell) => lit(cell)).join(", ")}},`)
		.join("\n");
	const groups = Object.entries(entry.groups)
		.map(([key, indexes]) => `\t{Key: ${lit(key)}, Rows: []int{${indexes.join(", ")}}},`)
		.join("\n");

	return `// ${entry.name} ${entry.doc}
var ${entry.name} = runtime.NewDataset(
\t[][]string{
${rows}
\t},
\t[]runtime.DataGroup{
${groups}
\t},
\t[]int{${entry.fullOrder.join(", ")}},
)`;
};

/** Renders one function. */
const func = (entry: FuncDecl): string => {
	const name = entry.exported ? pascal(entry.name) : entry.name;
	const params = entry.params
		.map((param) => `${param.name} ${type(param.ty)}`)
		.join(", ");
	const prologue = optionReads(entry)
		.map((read) => {
			const local = `${read.target}${pascal(read.field)}`;
			const fallback = read.expr.k === "optionField" ? expr(read.expr.fallback) : "nil";
			const declared = read.expr.k === "optionField" && read.expr.ty.k === "bool" ? "bool" : "int64";

			return `\tvar ${local} ${declared} = ${fallback}\n\tif ${read.target} != nil && ${read.target}.${pascal(read.field)} != nil {\n\t\t${local} = *${read.target}.${pascal(read.field)}\n\t}`;
		})
		.join("\n");
	const doc = prose(entry.doc)
		.split("\n")
		.map((line) => `// ${line}`.trimEnd())
		.join("\n");

	return `${doc === "" ? "" : `${doc.replace("// ", `// ${name} `)}\n`}func ${name}(${params}) ${type(entry.ret)} {
${prologue === "" ? "" : `${prologue}\n`}${block(entry.body, "\t")}
}`;
};

/**
 * Emits the Go target of one module.
 *
 * @param {Module} module - The compiled module.
 * @returns {Record<string, string>} The files, by path.
 */
export const emit = (module: Module): Record<string, string> => {
	verbatim = new Set([
		...module.charClasses.map((entry) => entry.name),
		...module.patterns.map((entry) => entry.name),
		...module.constants.map((entry) => entry.name),
		...module.data.map((entry) => entry.name),
	]);

	const constants = module.constants
		.map((entry) =>
			entry.ty.k === "list"
				? `var ${screaming(entry.name)} = ${expr(entry.expr)}`
				: `const ${screaming(entry.name)} = ${expr(entry.expr)}`,
		)
		.join("\n");

	return {
		"runtime/runtime.go": readFileSync(RUNTIME, "utf8"),
		"go.mod": "module brazilianutils/bridge\n\ngo 1.22\n",
		[`${module.name}/${module.name}.go`]: `// Code generated from spec/bridge/source/${module.name}.ts. DO NOT EDIT.

// Package ${module.name} holds the generated ${module.name} utilities.
package ${module.name}

import "brazilianutils/bridge/runtime"

${module.charClasses.map((entry) => charClass(entry)).join("\n")}

${module.patterns.map((entry) => pattern(entry)).join("\n\n")}

${constants}

${module.structs.map((entry) => struct(entry)).join("\n\n")}

${module.data.map((entry) => data(entry)).join("\n\n")}

${module.functions.map((entry) => func(entry)).join("\n\n")}
`,
	};
};
