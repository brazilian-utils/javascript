/**
 * The Python emitter.
 *
 * Snake case names, dataclasses for the options records, and the option fields hoisted into
 * locals by the prologue so the body reads like handwritten Python.
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
import { optionReads, prose, snake } from "../kit.ts";

/** Module level names the emitter writes verbatim: classes, patterns and constants. */
let verbatim = new Set<string>();

const RUNTIME = resolve(import.meta.dirname, "../runtime/python.py");

/** Renders a string as a Python literal. */
const lit = (value: string): string => {
	let out = '"';

	for (const char of value) {
		const code = char.codePointAt(0) ?? 0;

		if (char === '"') out += String.raw`\"`;
		else if (char === "\\") out += String.raw`\\`;
		else if (code < 0x20 || code > 0x7e) out += `\\U${code.toString(16).padStart(8, "0")}`;
		else out += char;
	}

	return `${out}"`;
};

/** Renders an IR type as a Python annotation. */
const type = (ty: Ty): string => {
	switch (ty.k) {
		case "string": {
			return "str";
		}
		case "int": {
			return "int";
		}
		case "bool": {
			return "bool";
		}
		case "void": {
			return "None";
		}
		case "json":
		case "scalar": {
			return "Any";
		}
		case "enum": {
			// A closed set of strings is still a string at run time; the compiler is the checker.
			return "str";
		}
		case "tasks": {
			return "Any";
		}
		case "list": {
			return `List[${type(ty.of)}]`;
		}
		case "opt": {
			return `Optional[${type(ty.of)}]`;
		}
		case "named": {
			return ty.name;
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
	"&&": "and",
	"||": "or",
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
			return node.value ? "True" : "False";
		}
		case "none": {
			return "None";
		}
		case "ref": {
			return verbatim.has(node.name) ? node.name : snake(node.name);
		}
		case "field": {
			return `${expr(node.target)}.${snake(node.name)}`;
		}
		case "index": {
			return `${expr(node.target)}[${expr(node.index)}]`;
		}
		case "not": {
			return `not ${expr(node.operand)}`;
		}
		case "bin": {
			// `x == None` works but reads wrong; identity is what the comparison means.
			if (node.right.k === "none" && (node.op === "==" || node.op === "!="))
				return `(${expr(node.left)} is ${node.op === "!=" ? "not " : ""}None)`;

			return `(${expr(node.left)} ${OPS[node.op]} ${expr(node.right)})`;
		}
		case "cond": {
			return `(${expr(node.whenTrue)} if ${expr(node.test)} else ${expr(node.whenFalse)})`;
		}
		case "listOf": {
			return `[${node.items.map((item) => expr(item)).join(", ")}]`;
		}
		case "struct": {
			return `${node.name}(${node.fields.map((field) => `${snake(field.name)}=${expr(field.value)}`).join(", ")})`;
		}
		case "optionField": {
			// The prologue binds every option read to a local of this name.
			return `${snake(node.target)}_${snake(node.field)}`;
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

/** Renders a call. */
const call = (node: Extract<Expr, { k: "call" }>): string => {
	const args = node.args.map((argument) => expr(argument));

	if (node.callee.k === "user") return `${snake(node.callee.name)}(${args.join(", ")})`;

	switch (node.callee.name) {
		case "len":
		case "listLen": {
			return `len(${args[0]})`;
		}
		case "codeAt": {
			return `code_at(${args[0]}, ${args[1]})`;
		}
		case "slice": {
			return `${args[0]}[${args[1]}:${args[2]}]`;
		}
		case "upper": {
			return `${args[0]}.upper()`;
		}
		case "trim": {
			return `js_trim(${args[0]})`;
		}
		case "padStart": {
			return `pad_start(${args[0]}, ${args[1]}, ${args[2]})`;
		}
		case "repeat": {
			return `(${args[0]} * ${args[1]})`;
		}
		case "classHas": {
			return `class_has(${args[0]}, ${args[1]})`;
		}
		case "keepClass": {
			return `keep_class(${args[0]}, ${args[1]})`;
		}
		case "patternTest": {
			return `pattern_test(${args[0]}, ${args[1]})`;
		}
		case "asString": {
			return `as_string(${args[0]})`;
		}
		case "isTruthy": {
			return `is_truthy(${args[0]})`;
		}
		case "listPush": {
			return `${args[0]}.append(${args[1]})`;
		}
		case "unwrap": {
			// Python has no separate optional value to open.
			return args[0];
		}
		case "dataAll": {
			return `data_all(${args[0]})`;
		}
		case "dataRows": {
			return `data_rows(${args[0]}, ${args[1]})`;
		}
		case "isNumber": {
			return `is_number(${args[0]})`;
		}
		case "isList": {
			return `is_list(${args[0]})`;
		}
		case "listHas": {
			return `list_has(${args[0]}, ${args[1]})`;
		}
		case "httpGet": {
			return `http_get(${args.join(", ")})`;
		}
		case "jsonString": {
			return `json_string(${args[0]}, ${args[1]})`;
		}
		case "jsonInt": {
			return `json_int(${args[0]}, ${args[1]})`;
		}
		case "jsonTruthy": {
			return `json_truthy(${args[0]}, ${args[1]})`;
		}
		case "jsonIsTrue": {
			return `json_is_true(${args[0]}, ${args[1]})`;
		}
		case "startAll": {
			return `start_all(${args.join(", ")})`;
		}
		case "firstSuccess": {
			return `first_success(${args[0]})`;
		}
		case "anyFailedWith": {
			return `any_failed_with(${args[0]}, ${args[1]})`;
		}
		default: {
			throw new Error(`python: unsupported runtime call ${node.callee.name}`);
		}
	}
};

/** Renders a statement list. */
const block = (body: Stmt[], indent: string): string => {
	const lines = body.map((statement) => stmt(statement, indent)).filter((line) => line !== "");

	return lines.length === 0 ? `${indent}pass` : lines.join("\n");
};

/** Renders one statement. */
const stmt = (node: Stmt, indent: string): string => {
	switch (node.k) {
		case "let":
		case "assign": {
			return `${indent}${snake(node.name)} = ${expr(node.value)}`;
		}
		case "if": {
			const otherwise =
				node.otherwise.length === 0
					? ""
					: `\n${indent}else:\n${block(node.otherwise, `${indent}    `)}`;

			return `${indent}if ${expr(node.test)}:\n${block(node.then, `${indent}    `)}${otherwise}`;
		}
		case "return": {
			return node.value === undefined ? `${indent}return` : `${indent}return ${expr(node.value)}`;
		}
		case "throw": {
			return `${indent}raise ${node.error}(${expr(node.message)})`;
		}
		case "try": {
			return `${indent}try:\n${block(node.body, `${indent}    `)}\n${indent}except Exception as ${snake(node.catchName)}:\n${block(node.catchBody, `${indent}    `)}`;
		}
		case "forRange": {
			return `${indent}for ${snake(node.name)} in range(${expr(node.from)}, ${expr(node.until)}):\n${block(node.body, `${indent}    `)}`;
		}
		case "forOf": {
			return `${indent}for ${snake(node.name)} in ${expr(node.iterable)}:\n${block(node.body, `${indent}    `)}`;
		}
		case "expr": {
			const value = node.value;

			if (value.k === "call" && value.callee.k === "std" && value.callee.name === "boundaryGuard") {
				const [subject, kind, fallback] = value.args;
				const name = subject.k === "ref" ? snake(subject.name) : "";
				const test =
					kind.k === "str" && kind.value === "string"
						? `not isinstance(${name}, str)`
						: `${name} is None`;

				return `${indent}if ${test}:\n${indent}    return ${expr(fallback)}`;
			}

			return `${indent}${expr(value)}`;
		}
	}
};

/** Renders a character class table entry. */
const charClass = (entry: CharClass): string =>
	`${entry.name}: CharClass = (${entry.ranges.map(([from, to]) => `(0x${from.toString(16)}, 0x${to.toString(16)})`).join(", ")},)`;

/** Renders a compiled pattern table entry. */
const pattern = (entry: PatternDecl): string =>
	`${entry.name} = (\n${entry.steps
		.map(
			(step) =>
				`    PatternStep(${step.charClass}, ${step.min}, ${step.max}, ${step.capture ? "True" : "False"}),`,
		)
		.join("\n")}\n)`;

/** Renders a dataset as the table the runtime materialises. */
const data = (entry: DataDecl): string => {
	const rows = entry.rows
		.map((row) => `        [${row.map((cell) => lit(cell)).join(", ")}],`)
		.join("\n");
	const groups = Object.entries(entry.groups)
		.map(([key, indexes]) => `        (${lit(key)}, [${indexes.join(", ")}]),`)
		.join("\n");

	return `# ${entry.doc}
${entry.name} = make_dataset(
    [
${rows}
    ],
    [
${groups}
    ],
    [${entry.fullOrder.join(", ")}],
)`;
};

/** Renders an error type. */
const error = (entry: ErrorDecl): string =>
	`class ${entry.name}(${entry.base ?? "Exception"}):
    """${entry.doc === "" ? entry.name : entry.doc.split("\n").join(" ")}"""`;

/** Renders an options record as a dataclass. */
const struct = (entry: StructDecl): string => {
	const fields = entry.fields
		.map((field) => {
			const declared = entry.isOptions ? `Optional[${type(field.ty)}] = None` : type(field.ty);

			return `${field.doc === "" ? "" : `    # ${field.doc}\n`}    ${snake(field.name)}: ${declared}`;
		})
		.join("\n");

	return `@dataclass
class ${entry.name}:
    """${entry.doc === "" ? entry.name : entry.doc}"""

${fields}`;
};

/** Renders one function. */
const func = (entry: FuncDecl): string => {
	const params = entry.params
		.map((param) => {
			if (param.optional)
				return `${snake(param.name)}: ${type(param.ty.k === "opt" ? param.ty : { k: "opt", of: param.ty })} = None`;

			// A public entry point takes whatever the caller hands it and guards at the boundary.
			const annotation = entry.exported && param.ty.k === "string" ? "Any" : type(param.ty);

			return `${snake(param.name)}: ${annotation}`;
		})
		.join(", ");

	const prologue = optionReads(entry)
		.map((read) => {
			const local = `${snake(read.target)}_${snake(read.field)}`;
			const fallback = read.expr.k === "optionField" ? expr(read.expr.fallback) : "None";

			return `    ${local} = ${fallback}\n    if ${snake(read.target)} is not None and ${snake(read.target)}.${snake(read.field)} is not None:\n        ${local} = ${snake(read.target)}.${snake(read.field)}`;
		})
		.join("\n");

	const text = prose(entry.doc);
	const doc = text === "" ? "" : `    """${text.split("\n").join("\n    ")}\n    """\n`;

	return `def ${snake(entry.name)}(${params}) -> ${type(entry.ret)}:
${doc}${prologue === "" ? "" : `${prologue}\n`}${block(entry.body, "    ")}`;
};

/**
 * Emits the Python target of one module.
 *
 * @param {Module} module - The compiled module.
 * @returns {Record<string, string>} The files, by path.
 */
export const emit = (module: Module, modules: Module[] = [module]): Record<string, string> => {
	verbatim = new Set([
		...module.charClasses.map((entry) => entry.name),
		...module.patterns.map((entry) => entry.name),
		...module.constants.map((entry) => entry.name),
		...module.data.map((entry) => entry.name),
	]);

	const constants = module.constants
		.map((entry) => `${entry.name} = ${expr(entry.expr)}`)
		.join("\n");

	return {
		"brutils_bridge/runtime.py": readFileSync(RUNTIME, "utf8"),
		"brutils_bridge/__init__.py": `"""Generated Brazilian Utils."""\n\n${modules
			.map((entry) => `from .${entry.name} import *  # noqa: F401,F403`)
			.join("\n")}\n`,
		[`brutils_bridge/${module.name}.py`]: `# Code generated from spec/bridge/source/${module.name}.ts. DO NOT EDIT.
"""${module.doc}"""

from dataclasses import dataclass
from typing import Any, List, Optional

from .runtime import (
    CharClass,
    PatternStep,
    any_failed_with,
    as_string,
    class_has,
    code_at,
    data_all,
    data_rows,
    first_success,
    http_get,
    is_list,
    is_number,
    is_truthy,
    js_trim,
    json_int,
    json_is_true,
    json_string,
    json_truthy,
    keep_class,
    list_has,
    make_dataset,
    pad_start,
    pattern_test,
    start_all,
)

${module.charClasses.map((entry) => charClass(entry)).join("\n")}

${module.patterns.map((entry) => pattern(entry)).join("\n\n")}

${constants}


${module.errors.map((entry) => error(entry)).join("\n\n\n")}


${module.structs
	.filter((entry) => entry.external !== true)
	.map((entry) => struct(entry))
	.join("\n\n\n")}


${module.data.map((entry) => data(entry)).join("\n\n")}


${module.functions.map((entry) => func(entry)).join("\n\n\n")}
`,
	};
};
