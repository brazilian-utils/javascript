/**
 * The Go emitter.
 *
 * Exported names in Go's style, options as a pointer to a struct of pointers so that "unset"
 * and "set to zero" stay distinguishable, and the option reads hoisted into locals by the
 * prologue.
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

const RUNTIME = resolve(import.meta.dirname, "../runtime/go.go");

/** The functions that return an error alongside their value. */
let throwing = new Set<string>();

/** The function being rendered, so a return knows whether to carry a nil error. */
let current: FuncDecl | undefined;

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
		case "enum": {
			return "string";
		}
		case "int": {
			return "int64";
		}
		case "bool": {
			return "bool";
		}
		case "void": {
			return "";
		}
		case "json": {
			return "any";
		}
		case "list": {
			return `[]${type(ty.of)}`;
		}
		case "opt": {
			// A pointer is already "or nothing"; a record is already a pointer.
			return ty.of.k === "named" ? type(ty.of) : `*${type(ty.of)}`;
		}
		case "named": {
			return `*${ty.name}`;
		}
		case "tasks": {
			return "*runtime.Attempts";
		}
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
			return "nil";
		}
		case "ref": {
			// Go's exported names are already the source's, constants included.
			return node.name;
		}
		case "field": {
			return `${expr(node.target)}.${pascal(node.name)}`;
		}
		case "index": {
			return `${expr(node.target)}[${expr(node.index)}]`;
		}
		case "not": {
			return `!${expr(node.operand)}`;
		}
		case "bin": {
			return `(${expr(node.left)} ${OPS[node.op]} ${expr(node.right)})`;
		}
		case "cond": {
			throw new Error("go: the ternary operator has no Go form; use an if statement");
		}
		case "listOf": {
			return `[]${type(node.of)}{${node.items.map((item) => expr(item)).join(", ")}}`;
		}
		case "struct": {
			return `&${node.name}{${node.fields
				.map((field) => `${pascal(field.name)}: ${expr(field.value)}`)
				.join(", ")}}`;
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

/** The zero value of a type, which is what a raising function returns alongside its error. */
const zero = (ty: Ty): string => {
	switch (ty.k) {
		case "int": {
			return "0";
		}
		case "bool": {
			return "false";
		}
		case "string":
		case "scalar":
		case "enum": {
			return `""`;
		}
		default: {
			return "nil";
		}
	}
};

/** Renders a call. */
const call = (node: Extract<Expr, { k: "call" }>): string => {
	const args = node.args.map((argument) => expr(argument));

	if (node.callee.k === "user") return `${node.callee.name}(${args.join(", ")})`;

	if (node.callee.name === "startAll") {
		const started = node.args[0].k === "ref" ? node.args[0].name : "";

		return `runtime.StartAll(func(item string, argument string) (any, error) { return ${started}(item, argument) }, ${args[1]}, ${args[2]})`;
	}

	if (node.callee.name === "firstSuccess")
		return `runtime.FirstSuccessOf[${type(node.ty.k === "opt" ? node.ty.of : node.ty)}](${args[0]})`;

	switch (node.callee.name) {
		case "len": {
			return `int64(runtime.Len(${args[0]}))`;
		}
		case "listLen": {
			return `int64(len(${args[0]}))`;
		}
		case "codeAt": {
			return `int64(runtime.CodeAt(${args[0]}, int(${args[1]})))`;
		}
		case "slice": {
			return `runtime.Slice(${args[0]}, int(${args[1]}), int(${args[2]}))`;
		}
		case "upper": {
			return `runtime.Upper(${args[0]})`;
		}
		case "trim": {
			return `runtime.JsTrim(${args[0]})`;
		}
		case "padStart": {
			return `runtime.PadStart(${args[0]}, int(${args[1]}), ${args[2]})`;
		}
		case "repeat": {
			return `runtime.Repeat(${args[0]}, int(${args[1]}))`;
		}
		case "classHas": {
			return `runtime.ClassHas(${args[0]}, ${args[1]})`;
		}
		case "keepClass": {
			return `runtime.KeepClass(${args[0]}, ${args[1]})`;
		}
		case "patternTest": {
			return `runtime.PatternTest(${args[0]}, ${args[1]})`;
		}
		case "asString": {
			// Go's type system already guarantees a string at the boundary.
			return args[0];
		}
		case "isTruthy": {
			return args[0];
		}
		case "listPush": {
			// `append` returns a new slice, so a push is an assignment; it is only ever a statement.
			return `${args[0]} = append(${args[0]}, ${args[1]})`;
		}
		case "unwrap": {
			// A record is already a pointer, and the prologue has already opened every option
			// read; only an optional parameter is still behind one.
			return node.ty.k === "named" || node.args[0].k === "optionField" ? args[0] : `*${args[0]}`;
		}
		case "dataAll": {
			return `runtime.DataAll(${args[0]})`;
		}
		case "dataRows": {
			return `runtime.DataRows(${args[0]}, ${args[1]})`;
		}
		case "isNumber": {
			// Go's parameter is a string, so the question cannot arise.
			return "false";
		}
		case "isList": {
			return "true";
		}
		case "listHas": {
			return `runtime.ListHas(${args[0]}, ${args[1]})`;
		}
		case "httpGet": {
			return `runtime.HttpGet(${args.join(", ")})`;
		}
		case "jsonString": {
			return `runtime.JsonString(${args[0]}, ${args[1]})`;
		}
		case "jsonInt": {
			return `runtime.JsonInt(${args[0]}, ${args[1]})`;
		}
		case "jsonTruthy": {
			return `runtime.JsonTruthy(${args[0]}, ${args[1]})`;
		}
		case "jsonIsTrue": {
			return `runtime.JsonIsTrue(${args[0]}, ${args[1]})`;
		}
		case "anyFailedWith": {
			return `runtime.AnyFailedWith(${args[0]}, ${args[1]})`;
		}
		default: {
			throw new Error(`go: unsupported runtime call ${node.callee.name}`);
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
			// Integers are int64 throughout, so they are declared rather than inferred: `:=` on a
			// literal would make an `int` that will not compare against the rest.
			return node.ty.k === "int"
				? `${indent}var ${node.name} int64 = ${expr(node.value)}`
				: `${indent}${node.name} := ${expr(node.value)}`;
		}
		case "assign": {
			return `${indent}${node.name} = ${expr(node.value)}`;
		}
		case "if": {
			const otherwise =
				node.otherwise.length === 0
					? ""
					: ` else {\n${block(node.otherwise, `${indent}\t`)}\n${indent}}`;

			return `${indent}if ${expr(node.test)} {\n${block(node.then, `${indent}\t`)}\n${indent}}${otherwise}`;
		}
		case "return": {
			if (current?.throws !== true)
				return node.value === undefined ? `${indent}return` : `${indent}return ${expr(node.value)}`;

			// A call to another raising function already carries both values.
			if (
				node.value?.k === "call" &&
				node.value.callee.k === "user" &&
				throwing.has(node.value.callee.name)
			)
				return `${indent}return ${expr(node.value)}`;

			return node.value === undefined
				? `${indent}return nil`
				: `${indent}return ${expr(node.value)}, nil`;
		}
		case "try": {
			throw new Error("go: try/catch has no Go form; a raising call answers an error instead");
		}
		case "throw": {
			return `${indent}return ${current === undefined ? "nil" : zero(current.ret)}, runtime.NewError(${node.error}Kinds, ${expr(node.message)})`;
		}
		case "forRange": {
			return `${indent}for ${node.name} := int64(${expr(node.from)}); ${node.name} < ${expr(node.until)}; ${node.name}++ {\n${block(node.body, `${indent}\t`)}\n${indent}}`;
		}
		case "forOf": {
			return `${indent}for _, ${node.name} := range ${expr(node.iterable)} {\n${block(node.body, `${indent}\t`)}\n${indent}}`;
		}
		case "expr": {
			const value = node.value;

			// Go's types make the boundary guards unnecessary, except for the nullish one on a
			// value that is a string here rather than a union.
			if (value.k === "call" && value.callee.k === "std" && value.callee.name === "boundaryGuard")
				return "";

			return `${indent}${expr(value)}`;
		}
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

/** Renders an error type: its kinds, and the predicate a caller matches on. */
const error = (entry: ErrorDecl): string =>
	`// ${entry.name}Kinds names ${entry.name}${entry.doc === "" ? "" : `: ${entry.doc}`}
var ${entry.name}Kinds = []string{${entry.kinds.map((kind) => lit(kind)).join(", ")}}

// Is${entry.name} reports whether err is a ${entry.name}.
func Is${entry.name}(err error) bool {
	return runtime.IsKind(err, ${lit(entry.name)})
}`;

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
	current = entry;

	const name = entry.exported ? pascal(entry.name) : entry.name;
	const params = entry.params.map((param) => `${param.name} ${type(param.ty)}`).join(", ");
	const prologue = optionReads(entry)
		.map((read) => {
			const local = `${read.target}${pascal(read.field)}`;
			const ty = read.expr.k === "optionField" ? read.expr.ty : ({ k: "int" } as Ty);
			const fallback = read.expr.k === "optionField" ? expr(read.expr.fallback) : "nil";

			return `\tvar ${local} ${type(ty)} = ${fallback}\n\tif ${read.target} != nil && ${read.target}.${pascal(read.field)} != nil {\n\t\t${local} = *${read.target}.${pascal(read.field)}\n\t}`;
		})
		.join("\n");
	const doc = prose(entry.doc)
		.split("\n")
		.map((line) => `// ${line}`.trimEnd())
		.join("\n");

	// Go has no exceptions, so a function that can raise says so in its signature and the
	// emitter threads the error through; the source never mentions it.
	const returns = entry.throws ? `(${type(entry.ret)}, error)` : type(entry.ret);

	return `${doc === "" ? "" : `${doc.replace("// ", `// ${name} `)}\n`}func ${name}(${params}) ${returns} {
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
	throwing = new Set(module.functions.filter((entry) => entry.throws).map((entry) => entry.name));
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

${module.errors.map((entry) => error(entry)).join("\n\n")}

${module.structs
	.filter((entry) => entry.external !== true)
	.map((entry) => struct(entry))
	.join("\n\n")}

${module.data.map((entry) => data(entry)).join("\n\n")}

${module.functions.map((entry) => func(entry)).join("\n\n")}
`,
	};
};
