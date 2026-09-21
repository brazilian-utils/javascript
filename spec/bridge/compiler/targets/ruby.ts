/**
 * The Ruby emitter.
 *
 * Module functions under `BrazilianUtilsBridge`, options as a keyword initialised Struct, and
 * the option reads hoisted into locals by the prologue.
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
} from "../ir.ts";
import { optionReads, prose, screaming, snake } from "../kit.ts";

const RUNTIME = resolve(import.meta.dirname, "../runtime/ruby.rb");
const NAMESPACE = "BrazilianUtilsBridge";

/** Module level names the emitter writes verbatim. */
let verbatim = new Set<string>();

/** Renders a string as a Ruby literal. */
const lit = (value: string): string => {
	let out = '"';

	for (const char of value) {
		const code = char.codePointAt(0) ?? 0;

		if (char === '"') out += String.raw`\"`;
		else if (char === "\\") out += String.raw`\\`;
		else if (char === "#") out += String.raw`\#`;
		else if (code < 0x20 || code > 0x7e) out += `\\u{${code.toString(16)}}`;
		else out += char;
	}

	return `${out}"`;
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
			return verbatim.has(node.name) ? screaming(node.name) : snake(node.name);
		}
		case "field": {
			return `${expr(node.target)}.${snake(node.name)}`;
		}
		case "index": {
			return `${expr(node.target)}[${expr(node.index)}]`;
		}
		case "not": {
			return `!${expr(node.operand)}`;
		}
		case "bin": {
			// `x == nil` works but `nil?` is what a Ruby reader expects.
			if (node.right.k === "none" && (node.op === "==" || node.op === "!="))
				return `${node.op === "!=" ? "!" : ""}${expr(node.left)}.nil?`;

			return `(${expr(node.left)} ${OPS[node.op]} ${expr(node.right)})`;
		}
		case "cond": {
			return `(${expr(node.test)} ? ${expr(node.whenTrue)} : ${expr(node.whenFalse)})`;
		}
		case "listOf": {
			return `[${node.items.map((item) => expr(item)).join(", ")}]`;
		}
		case "struct": {
			return `${node.name}.new(${node.fields
				.map((field) => `${snake(field.name)}: ${expr(field.value)}`)
				.join(", ")})`;
		}
		case "optionField": {
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
			return `${args[0]}.length`;
		}
		case "codeAt": {
			return `Runtime.code_at(${args[0]}, ${args[1]})`;
		}
		case "slice": {
			return `${args[0]}[${args[1]}...${args[2]}]`;
		}
		case "upper": {
			return `${args[0]}.upcase`;
		}
		case "trim": {
			return `Runtime.js_trim(${args[0]})`;
		}
		case "padStart": {
			return `Runtime.pad_start(${args[0]}, ${args[1]}, ${args[2]})`;
		}
		case "repeat": {
			return `(${args[0]} * ${args[1]})`;
		}
		case "classHas": {
			return `Runtime.class_has(${args[0]}, ${args[1]})`;
		}
		case "keepClass": {
			return `Runtime.keep_class(${args[0]}, ${args[1]})`;
		}
		case "patternTest": {
			return `Runtime.pattern_test(${args[0]}, ${args[1]})`;
		}
		case "asString": {
			return `Runtime.as_string(${args[0]})`;
		}
		case "isTruthy": {
			return `Runtime.is_truthy(${args[0]})`;
		}
		case "listPush": {
			return `${args[0]}.push(${args[1]})`;
		}
		case "unwrap": {
			// Ruby has no separate optional value to open.
			return args[0];
		}
		case "dataAll": {
			return `Runtime.data_all(${args[0]})`;
		}
		case "dataRows": {
			return `Runtime.data_rows(${args[0]}, ${args[1]})`;
		}
		case "isNumber": {
			return `Runtime.is_number(${args[0]})`;
		}
		case "isList": {
			return `Runtime.is_list(${args[0]})`;
		}
		case "listHas": {
			return `Runtime.list_has(${args[0]}, ${args[1]})`;
		}
		case "httpGet": {
			return `Runtime.http_get(${args.join(", ")})`;
		}
		case "jsonString": {
			return `Runtime.json_string(${args[0]}, ${args[1]})`;
		}
		case "jsonInt": {
			return `Runtime.json_int(${args[0]}, ${args[1]})`;
		}
		case "jsonTruthy": {
			return `Runtime.json_truthy(${args[0]}, ${args[1]})`;
		}
		case "jsonIsTrue": {
			return `Runtime.json_is_true(${args[0]}, ${args[1]})`;
		}
		case "startAll": {
			return `Runtime.start_all(method(:${args[0]}), ${args[1]}, ${args[2]})`;
		}
		case "firstSuccess": {
			return `Runtime.first_success(${args[0]})`;
		}
		case "anyFailedWith": {
			return `Runtime.any_failed_with(${args[0]}, ${args[1]})`;
		}
		default: {
			throw new Error(`ruby: unsupported runtime call ${node.callee.name}`);
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
		case "let":
		case "assign": {
			return `${indent}${snake(node.name)} = ${expr(node.value)}`;
		}
		case "if": {
			const otherwise =
				node.otherwise.length === 0
					? ""
					: `\n${indent}else\n${block(node.otherwise, `${indent}  `)}`;

			return `${indent}if ${expr(node.test)}\n${block(node.then, `${indent}  `)}${otherwise}\n${indent}end`;
		}
		case "return": {
			return node.value === undefined ? `${indent}return` : `${indent}return ${expr(node.value)}`;
		}
		case "throw": {
			return `${indent}raise ${node.error}, ${expr(node.message)}`;
		}
		case "try": {
			return `${indent}begin\n${block(node.body, `${indent}  `)}\n${indent}rescue StandardError => ${snake(node.catchName)}\n${block(node.catchBody, `${indent}  `)}\n${indent}end`;
		}
		case "forRange": {
			return `${indent}(${expr(node.from)}...${expr(node.until)}).each do |${snake(node.name)}|\n${block(node.body, `${indent}  `)}\n${indent}end`;
		}
		case "forOf": {
			return `${indent}${expr(node.iterable)}.each do |${snake(node.name)}|\n${block(node.body, `${indent}  `)}\n${indent}end`;
		}
		case "expr": {
			const value = node.value;

			if (value.k === "call" && value.callee.k === "std" && value.callee.name === "boundaryGuard") {
				const [subject, kind, fallback] = value.args;
				const name = subject.k === "ref" ? snake(subject.name) : "";
				const test =
					kind.k === "str" && kind.value === "string" ? `!${name}.is_a?(String)` : `${name}.nil?`;

				return `${indent}return ${expr(fallback)} if ${test}`;
			}

			return `${indent}${expr(value)}`;
		}
	}
};

/** Renders a character class table entry. */
const charClass = (entry: CharClass): string =>
	`    ${screaming(entry.name)} = [${entry.ranges.map(([from, to]) => `[0x${from.toString(16)}, 0x${to.toString(16)}]`).join(", ")}].freeze`;

/** Renders a compiled pattern table entry. */
const pattern = (entry: PatternDecl): string =>
	`    ${screaming(entry.name)} = [\n${entry.steps
		.map(
			(step) =>
				`      Runtime::PatternStep.new(${screaming(step.charClass)}, ${step.min}, ${step.max}, ${step.capture}),`,
		)
		.join("\n")}\n    ].freeze`;

/** Renders an options record. */
const struct = (entry: StructDecl): string =>
	`    # ${entry.doc}\n    ${entry.name} = Struct.new(${entry.fields
		.map((field) => `:${snake(field.name)}`)
		.join(", ")}, keyword_init: true)`;

/** Renders an error type. */
const error = (entry: ErrorDecl): string =>
	`    # ${entry.doc === "" ? entry.name : entry.doc}\n    class ${entry.name} < ${entry.base ?? "StandardError"}; end`;

/** Renders a dataset as the table the runtime materialises. */
const data = (entry: DataDecl): string => {
	const rows = entry.rows
		.map((row) => `        [${row.map((cell) => lit(cell)).join(", ")}],`)
		.join("\n");
	const groups = Object.entries(entry.groups)
		.map(([key, indexes]) => `        [${lit(key)}, [${indexes.join(", ")}]],`)
		.join("\n");

	return `    # ${entry.doc}
    ${screaming(entry.name)} = Runtime.make_dataset(
      [
${rows}
      ],
      [
${groups}
      ],
      [${entry.fullOrder.join(", ")}]
    )`;
};

/** Renders one function. */
const func = (entry: FuncDecl): string => {
	const params = entry.params
		.map((param) => (param.optional ? `${snake(param.name)} = nil` : snake(param.name)))
		.join(", ");
	const prologue = optionReads(entry)
		.map((read) => {
			const local = `${snake(read.target)}_${snake(read.field)}`;
			const fallback = read.expr.k === "optionField" ? expr(read.expr.fallback) : "nil";
			const target = snake(read.target);

			return `      ${local} = ${fallback}\n      ${local} = ${target}.${snake(read.field)} unless ${target}.nil? || ${target}.${snake(read.field)}.nil?`;
		})
		.join("\n");
	const doc = prose(entry.doc)
		.split("\n")
		.map((line) => `    # ${line}`.trimEnd())
		.join("\n");

	return `${doc === "" ? "" : `${doc}\n`}    def self.${snake(entry.name)}(${params})
${prologue === "" ? "" : `${prologue}\n`}${block(entry.body, "      ")}
    end`;
};

/**
 * Emits the Ruby target of one module.
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

	const moduleName = `${module.name.charAt(0).toUpperCase()}${module.name.slice(1)}`;
	const constants = module.constants
		.map((entry) => `    ${screaming(entry.name)} = ${expr(entry.expr)}.freeze`)
		.join("\n");

	return {
		"lib/brazilian_utils_bridge/runtime.rb": readFileSync(RUNTIME, "utf8"),
		[`lib/brazilian_utils_bridge/${module.name}.rb`]: `# frozen_string_literal: true

# Code generated from spec/bridge/source/${module.name}.ts. DO NOT EDIT.

require_relative 'runtime'

module ${NAMESPACE}
  # ${module.doc}
  module ${moduleName}
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
  end
end
`,
	};
};
