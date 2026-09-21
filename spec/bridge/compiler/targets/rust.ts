/**
 * The Rust emitter.
 *
 * `&str` in, owned `String` out, options behind an `Option<&T>`, and the option reads hoisted
 * into locals by the prologue so the body has no nested matches.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
	CharClass,
	DataDecl,
	Expr,
	FuncDecl,
	Module,
	Param,
	PatternDecl,
	Stmt,
	StructDecl,
	Ty,
} from "../ir.ts";
import { optionReads, prose, pushTargets, screaming, snake } from "../kit.ts";

/** The record types of the module being emitted, so a struct literal owns its fields. */
let structs = new Map<string, StructDecl>();

/** The datasets of the module, which are functions rather than statics in Rust. */
let datasets = new Set<string>();

const RUNTIME = resolve(import.meta.dirname, "../runtime/rust.rs");

/** Module level names the emitter writes verbatim. */
let verbatim = new Set<string>();

/** Parameter lists of the module's own functions, so calls borrow exactly where they must. */
let signatures = new Map<string, Param[]>();

/** Renders a string as a Rust literal. */
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

/** Renders an IR type. */
const type = (ty: Ty): string => {
	switch (ty.k) {
		case "string":
		case "scalar":
		case "enum":
			return "String";
		case "int":
			return "i64";
		case "bool":
			return "bool";
		case "void":
			return "()";
		case "json":
			return "String";
		case "list":
			// A dataset row is borrowed from the table rather than rebuilt for every reader.
			if (ty.of.k === "list" && ty.of.of.k === "string") return "Vec<runtime::Row>";

			return `Vec<${type(ty.of)}>`;
		case "opt":
			return `Option<${type(ty.of)}>`;
		case "named":
			return ty.name;
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

/** Renders an expression, borrowing where the runtime takes a `&str`. */
const asStr = (node: Expr): string => {
	const rendered = expr(node);

	if (node.k === "str") return rendered;

	return `&${rendered}`;
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
			return "None";
		case "ref":
			if (datasets.has(node.name)) return `${snake(node.name)}_table()`;

			return verbatim.has(node.name) ? screaming(node.name) : snake(node.name);
		case "field":
			return `${expr(node.target)}.${snake(node.name)}`;
		case "index":
			return `${expr(node.target)}[${expr(node.index)} as usize]`;
		case "not":
			return `!${expr(node.operand)}`;
		case "bin": {
			if (node.right.k === "none" && (node.op === "==" || node.op === "!="))
				return `${expr(node.left)}.${node.op === "!=" ? "is_some" : "is_none"}()`;

			if (node.op === "+" && node.ty?.k === "string")
				return `format!("{}{}", ${expr(node.left)}, ${expr(node.right)})`;

			return `(${expr(node.left)} ${OPS[node.op]} ${expr(node.right)})`;
		}
		case "cond":
			return `(if ${expr(node.test)} { ${expr(node.whenTrue)} } else { ${expr(node.whenFalse)} })`;
		case "listOf":
			// A list that only ever holds literals is a fixed size array; anything else is a Vec.
			if (node.of.k === "int") return `[${node.items.map((item) => expr(item)).join(", ")}]`;

			return `vec![${node.items.map((item) => expr(item)).join(", ")}]`;
		case "struct": {
			const declared = structs.get(node.name);

			return `${node.name} { ${node.fields
				.map((field) => {
					const ty = declared?.fields.find((candidate) => candidate.name === field.name)?.ty;

					return `${snake(field.name)}: ${owned(field.value, ty)}`;
				})
				.join(", ")} }`;
		}
		case "optionField":
			return `${snake(node.target)}_${snake(node.field)}`;
		case "call":
			return call(node);
		default:
			throw new Error(`rust: unsupported expression ${node.k}`);
	}
};

/** Renders a call. */
const call = (node: Extract<Expr, { k: "call" }>): string => {
	const args = node.args;

	if (node.callee.k === "user") {
		const params = signatures.get(node.callee.name) ?? [];
		const rendered = args.map((argument, index) => {
			const ty = params[index]?.ty;

			if (ty === undefined) return expr(argument);
			if (ty.k === "list" && ty.of.k === "string") return expr(argument);
			if (ty.k === "string" || ty.k === "scalar" || ty.k === "enum" || ty.k === "list")
				return asStr(argument);

			return expr(argument);
		});

		return `${snake(node.callee.name)}(${rendered.join(", ")})`;
	}

	switch (node.callee.name) {
		case "listPush":
			return `${expr(args[0])}.push(${expr(args[1])})`;
		case "unwrap":
			return `${expr(args[0])}.unwrap()`;
		case "dataAll":
			return `runtime::data_all(${expr(args[0])})`;
		case "dataRows":
			return `runtime::data_rows(${expr(args[0])}, ${asStr(args[1])})`;
		case "len":
			return `runtime::len(${asStr(args[0])})`;
		case "listLen":
			return `(${expr(args[0])}.len() as i64)`;
		case "codeAt":
			return `runtime::code_at(${asStr(args[0])}, ${expr(args[1])})`;
		case "slice":
			return `runtime::slice(${asStr(args[0])}, ${expr(args[1])}, ${expr(args[2])})`;
		case "upper":
			return `runtime::upper(${asStr(args[0])})`;
		case "trim":
			return `runtime::js_trim(${asStr(args[0])})`;
		case "padStart":
			return `runtime::pad_start(${asStr(args[0])}, ${expr(args[1])}, ${asStr(args[2])})`;
		case "repeat":
			return `runtime::repeat(${asStr(args[0])}, ${expr(args[1])})`;
		case "classHas":
			return `runtime::class_has(${expr(args[0])}, ${asStr(args[1])})`;
		case "keepClass":
			return `runtime::keep_class(${expr(args[0])}, ${asStr(args[1])})`;
		case "patternTest":
			return `runtime::pattern_test(${expr(args[0])}, ${asStr(args[1])})`;
		case "asString":
			return `${expr(args[0])}.to_string()`;
		case "isTruthy":
			return expr(args[0]);
		default:
			throw new Error(`rust: unsupported runtime call ${node.callee.name}`);
	}
};

/** Names that are borrowed `&str` in the current function: its string parameters and consts. */
let borrowed = new Set<string>();

/** Locals the body pushes onto, which Rust needs declared `mut`. */
let mutated = new Set<string>();

/** Local variable types of the function being rendered, so assignments can own their value. */
let localTypes = new Map<string, Ty>();

/**
 * Renders an expression as an owned `String` when the target type asks for one.
 *
 * @param {Expr} node - The expression.
 * @param {Ty} [ty] - The type the value is being stored in.
 * @returns {string} The rendered expression.
 */
const owned = (node: Expr, ty?: Ty): string => {
	const rendered = expr(node);

	if (ty !== undefined && ty.k !== "string" && ty.k !== "scalar" && ty.k !== "enum") return rendered;
	if (node.k === "str") return `${rendered}.to_string()`;
	if (node.k === "index" && (node.ty?.k === "string" || node.ty?.k === "enum"))
		return `${rendered}.to_string()`;
	if (node.k === "ref" && borrowed.has(node.name)) return `${rendered}.to_string()`;

	return rendered;
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
			return `${indent}let ${node.mutable || mutated.has(node.name) ? "mut " : ""}${snake(node.name)}: ${type(node.ty)} = ${owned(node.value, node.ty)};`;
		case "assign":
			return `${indent}${snake(node.name)} = ${owned(node.value, localTypes.get(node.name))};`;
		case "if": {
			const otherwise =
				node.otherwise.length === 0 ? "" : ` else {\n${block(node.otherwise, `${indent}\t`)}\n${indent}}`;

			return `${indent}if ${expr(node.test)} {\n${block(node.then, `${indent}\t`)}\n${indent}}${otherwise}`;
		}
		case "return":
			return node.value === undefined ? `${indent}return;` : `${indent}return ${expr(node.value)};`;
		case "forRange":
			return `${indent}for ${snake(node.name)} in ${expr(node.from)}..${expr(node.until)} {\n${block(node.body, `${indent}\t`)}\n${indent}}`;
		case "forOf":
			// The loop consumes the list: nothing in the subset reads one after iterating it.
			return `${indent}for ${snake(node.name)} in ${expr(node.iterable)} {\n${block(node.body, `${indent}\t`)}\n${indent}}`;
		case "expr": {
			const value = node.value;

			// Rust's types make the boundary guards unnecessary.
			if (value.k === "call" && value.callee.k === "std" && value.callee.name === "boundaryGuard")
				return "";

			return `${indent}${expr(value)};`;
		}
		default:
			throw new Error(`rust: unsupported statement ${node.k}`);
	}
};

/** Renders a character class table entry. */
const charClass = (entry: CharClass): string =>
	`const ${screaming(entry.name)}: runtime::CharClass = &[${entry.ranges.map(([from, to]) => `(0x${from.toString(16)}, 0x${to.toString(16)})`).join(", ")}];`;

/** Renders a compiled pattern table entry. */
const pattern = (entry: PatternDecl): string =>
	`const ${screaming(entry.name)}: &[runtime::PatternStep] = &[\n${entry.steps
		.map(
			(step) =>
				`\truntime::PatternStep { class: ${screaming(step.charClass)}, min: ${step.min}, max: ${step.max}, capture: ${step.capture} },`,
		)
		.join("\n")}\n];`;

/** Renders an options record. */
const struct = (entry: StructDecl): string => {
	const fields = entry.fields
		.map((field) => {
			const declared = entry.isOptions ? `Option<${type(field.ty)}>` : type(field.ty);

			return `${field.doc === "" ? "" : `\t/// ${field.doc}\n`}\tpub ${snake(field.name)}: ${declared},`;
		})
		.join("\n");

	return `/// ${entry.doc}
#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct ${entry.name} {
${fields}
}`;
};

/** Renders one function. */
const func = (entry: FuncDecl): string => {
	borrowed = new Set([
		...entry.params
			.filter((param) => param.ty.k === "string" || param.ty.k === "scalar")
			.map((param) => param.name),
		...[...verbatim],
	]);
	localTypes = new Map();
	mutated = pushTargets(entry);

	const collect = (body: Stmt[]): void => {
		for (const statement of body) {
			if (statement.k === "let") localTypes.set(statement.name, statement.ty);
			if (statement.k === "if") {
				collect(statement.then);
				collect(statement.otherwise);
			}
			if (statement.k === "forOf" || statement.k === "forRange") collect(statement.body);
			if (statement.k === "try") {
				collect(statement.body);
				collect(statement.catchBody);
			}
		}
	};

	collect(entry.body);

	const params = entry.params
		.map((param) => {
			if (param.optional) {
				const of = param.ty.k === "opt" ? param.ty.of : param.ty;

				return `${snake(param.name)}: Option<&${of.k === "named" ? type(of) : "str"}>`;
			}

			if (param.ty.k === "string" || param.ty.k === "scalar" || param.ty.k === "enum")
				return `${snake(param.name)}: &str`;
			if (param.ty.k === "list")
				return param.ty.of.k === "string"
					? `${snake(param.name)}: runtime::Row`
					: `${snake(param.name)}: &[${type(param.ty.of)}]`;

			return `${snake(param.name)}: ${type(param.ty)}`;
		})
		.join(", ");

	const prologue = optionReads(entry)
		.map((read) => {
			const local = `${snake(read.target)}_${snake(read.field)}`;
			const fallback = read.expr.k === "optionField" ? expr(read.expr.fallback) : "None";

			return `\tlet ${local} = match ${snake(read.target)} {\n\t\tNone => ${fallback},\n\t\tSome(value) => value.${snake(read.field)}.unwrap_or(${fallback}),\n\t};`;
		})
		.join("\n");

	const doc = prose(entry.doc)
		.split("\n")
		.map((line) => `/// ${line}`.trimEnd())
		.join("\n");

	return `${doc === "" ? "" : `${doc}\n`}pub fn ${snake(entry.name)}(${params}) -> ${type(entry.ret)} {
${prologue === "" ? "" : `${prologue}\n`}${block(entry.body, "\t")}
}`;
};

/** Renders a dataset as the statics the runtime materialises, behind a `OnceLock`. */
const data = (entry: DataDecl): string => {
	const upper = screaming(entry.name);
	const rows = entry.rows
		.map((row) => `\t&[${row.map((cell) => lit(cell)).join(", ")}],`)
		.join("\n");
	const groups = Object.entries(entry.groups)
		.map(([key, indexes]) => `\t(${lit(key)}, &[${indexes.join(", ")}]),`)
		.join("\n");

	return `static ${upper}_ROWS: &[runtime::Row] = &[
${rows}
];

static ${upper}_GROUPS: &[(&str, &[usize])] = &[
${groups}
];

static ${upper}_ORDER: &[usize] = &[${entry.fullOrder.join(", ")}];

/// ${entry.doc}
fn ${snake(entry.name)}_table() -> &'static runtime::Dataset {
\tstatic TABLE: std::sync::OnceLock<runtime::Dataset> = std::sync::OnceLock::new();

\tTABLE.get_or_init(|| runtime::Dataset::new(${upper}_ROWS, ${upper}_GROUPS, ${upper}_ORDER))
}`;
};

/**
 * Emits the Rust target of one module.
 *
 * @param {Module} module - The compiled module.
 * @returns {Record<string, string>} The files, by path.
 */
export const emit = (module: Module, modules: Module[] = [module]): Record<string, string> => {
	signatures = new Map(module.functions.map((entry) => [entry.name, entry.params]));
	structs = new Map(module.structs.map((entry) => [entry.name, entry]));
	datasets = new Set(module.data.map((entry) => entry.name));
	verbatim = new Set([
		...module.charClasses.map((entry) => entry.name),
		...module.patterns.map((entry) => entry.name),
		...module.constants.map((entry) => entry.name),
	]);

	const constants = module.constants
		.map((entry) =>
			entry.ty.k === "list"
				? `const ${screaming(entry.name)}: [i64; ${(entry.expr as Extract<Expr, { k: "listOf" }>).items.length}] = ${expr(entry.expr)};`
				: `const ${screaming(entry.name)}: &str = ${expr(entry.expr)};`,
		)
		.join("\n");

	return {
		"src/runtime.rs": readFileSync(RUNTIME, "utf8"),
		"src/lib.rs": `// Code generated from spec/bridge/source. DO NOT EDIT.

//! Generated Brazilian Utils.

pub mod runtime;
${modules.map((entry) => `pub mod ${entry.name};`).join("\n")}
`,
		"Cargo.toml": `[package]
name = "brazilian_utils_bridge"
version = "0.0.0"
edition = "2021"
publish = false

[lib]
path = "src/lib.rs"
`,
		[`src/${module.name}.rs`]: `// Code generated from spec/bridge/source/${module.name}.ts. DO NOT EDIT.

//! ${module.doc}

use crate::runtime;

${module.charClasses.map((entry) => charClass(entry)).join("\n")}

${module.patterns.map((entry) => pattern(entry)).join("\n\n")}

${constants}

${module.structs.map((entry) => struct(entry)).join("\n\n")}

${module.data.map((entry) => data(entry)).join("\n\n")}

${module.functions.map((entry) => func(entry)).join("\n\n")}
`,
	};
};
