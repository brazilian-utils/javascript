/**
 * The C# emitter.
 *
 * A static class per module, nullable value types for the options, and the option reads
 * hoisted into locals by the prologue. C#'s strings are UTF-16 like JavaScript's, so indexes
 * need no translation.
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

/** The record types of the module being emitted, so a literal calls the right constructor. */
let structs = new Map<string, StructDecl>();

/** The declared types in scope, so a list knows whether it is an array or a growing list. */
let localTypes = new Map<string, Ty>();

/** Splits a list into fixed size chunks, so no one method carries the whole table. */
const chunks = <T>(items: T[], size: number): T[][] => {
	const out: T[][] = [];

	for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));

	return out;
};

const RUNTIME = resolve(import.meta.dirname, "../runtime/csharp.cs");
const NAMESPACE = "BrazilianUtils.Bridge";

/** Module level names the emitter writes verbatim. */
let verbatim = new Set<string>();

/**
 * C# keywords a source level identifier can collide with; `@` escapes them.
 *
 * @param {string} name - The identifier from the source.
 * @returns {string} A form C# accepts.
 */
const safe = (name: string): string =>
	new Set([
		"base",
		"class",
		"default",
		"event",
		"fixed",
		"lock",
		"object",
		"operator",
		"params",
		"ref",
		"string",
		"value",
	]).has(name)
		? `@${name}`
		: name;

const CONTROL: Record<number, string> = {
	0x08: "\\b",
	0x09: "\\t",
	0x0a: "\\n",
	0x0c: "\\f",
	0x0d: "\\r",
};

/** Renders a string as a C# literal. */
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
		case "enum":
			return "string";
		case "int":
			return "long";
		case "bool":
			return "bool";
		case "void":
			return "void";
		case "list":
			// A list of records is built by appending, which an array cannot do.
			return ty.of.k === "named"
				? `System.Collections.Generic.List<${type(ty.of)}>`
				: `${type(ty.of)}[]`;
		case "opt":
			return `${type(ty.of)}?`;
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

/** Renders an expression. */
const expr = (node: Expr): string => {
	switch (node.k) {
		case "str":
			return lit(node.value);
		case "int":
			return `${node.value}L`;
		case "bool":
			return String(node.value);
		case "none":
			return "null";
		case "ref":
			return verbatim.has(node.name) ? screaming(node.name) : safe(node.name);
		case "field":
			return `${expr(node.target)}.${pascal(node.name)}`;
		case "index":
			return `${expr(node.target)}[(int) ${expr(node.index)}]`;
		case "not":
			return `!${expr(node.operand)}`;
		case "bin":
			return `(${expr(node.left)} ${OPS[node.op]} ${expr(node.right)})`;
		case "cond":
			return `(${expr(node.test)} ? ${expr(node.whenTrue)} : ${expr(node.whenFalse)})`;
		case "listOf":
			if (node.of.k === "named")
				return `new System.Collections.Generic.List<${type(node.of)}>()`;

			return `{ ${node.items.map((item) => expr(item)).join(", ")} }`;
		case "struct": {
			const declared = structs.get(node.name);
			const order = declared?.fields.map((field) => field.name) ?? node.fields.map((f) => f.name);

			return `new ${node.name}(${order
				.map((name) => expr(node.fields.find((field) => field.name === name)?.value ?? { k: "none" }))
				.join(", ")})`;
		}
		case "optionField":
			return `${safe(node.target)}${pascal(node.field)}`;
		case "call":
			return call(node);
		default:
			throw new Error(`csharp: unsupported expression ${node.k}`);
	}
};

/** Whether an expression is a growing list rather than an array. */
const isGrowing = (node: Expr): boolean => {
	if (node.k !== "ref") return false;

	const ty = localTypes.get(node.name);

	return ty !== undefined && ty.k === "list" && ty.of.k === "named";
};

/** Renders a call. */
const call = (node: Extract<Expr, { k: "call" }>): string => {
	const args = node.args.map((argument) => expr(argument));

	if (node.callee.k === "user") return `${pascal(node.callee.name)}(${args.join(", ")})`;

	switch (node.callee.name) {
		case "len":
			return `(long) ${args[0]}.Length`;
		case "listLen":
			return isGrowing(node.args[0]) ? `(long) ${args[0]}.Count` : `(long) ${args[0]}.Length`;
		case "codeAt":
			return `Runtime.CodeAt(${args[0]}, ${args[1]})`;
		case "slice":
			return `Runtime.Slice(${args[0]}, ${args[1]}, ${args[2]})`;
		case "upper":
			return `${args[0]}.ToUpperInvariant()`;
		case "trim":
			return `Runtime.JsTrim(${args[0]})`;
		case "padStart":
			return `Runtime.PadStart(${args[0]}, ${args[1]}, ${args[2]})`;
		case "repeat":
			return `Runtime.Repeat(${args[0]}, ${args[1]})`;
		case "classHas":
			return `Runtime.ClassHas(${args[0]}, ${args[1]})`;
		case "keepClass":
			return `Runtime.KeepClass(${args[0]}, ${args[1]})`;
		case "patternTest":
			return `Runtime.PatternTest(${args[0]}, ${args[1]})`;
		case "asString":
			// C#'s types already guarantee a string at the boundary.
			return args[0];
		case "isTruthy":
			return args[0];
		case "listPush":
			return `${args[0]}.Add(${args[1]})`;
		case "unwrap":
			// C# has no separate optional value to open; a reference is already nullable.
			return args[0];
		case "dataAll":
			return `Runtime.DataAll(${args[0]})`;
		case "dataRows":
			return `Runtime.DataRows(${args[0]}, ${args[1]})`;
		default:
			throw new Error(`csharp: unsupported runtime call ${node.callee.name}`);
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
			localTypes.set(node.name, node.ty);

			return `${indent}${type(node.ty)} ${safe(node.name)} = ${expr(node.value)};`;
		case "assign":
			return `${indent}${safe(node.name)} = ${expr(node.value)};`;
		case "if": {
			const otherwise =
				node.otherwise.length === 0
					? ""
					: `\n${indent}else\n${indent}{\n${block(node.otherwise, `${indent}    `)}\n${indent}}`;

			return `${indent}if (${expr(node.test)})\n${indent}{\n${block(node.then, `${indent}    `)}\n${indent}}${otherwise}`;
		}
		case "return":
			return node.value === undefined ? `${indent}return;` : `${indent}return ${expr(node.value)};`;
		case "forRange":
			return `${indent}for (long ${safe(node.name)} = ${expr(node.from)}; ${safe(node.name)} < ${expr(node.until)}; ${safe(node.name)}++)\n${indent}{\n${block(node.body, `${indent}    `)}\n${indent}}`;
		case "forOf":
			return `${indent}foreach (var ${safe(node.name)} in ${expr(node.iterable)})\n${indent}{\n${block(node.body, `${indent}    `)}\n${indent}}`;
		case "expr": {
			const value = node.value;

			if (value.k === "call" && value.callee.k === "std" && value.callee.name === "boundaryGuard") {
				const [subject, , fallback] = value.args;
				const name = subject.k === "ref" ? safe(subject.name) : "";

				return `${indent}if (${name} == null)\n${indent}{\n${indent}    return ${expr(fallback)};\n${indent}}`;
			}

			return `${indent}${expr(value)};`;
		}
		default:
			throw new Error(`csharp: unsupported statement ${node.k}`);
	}
};

/** Renders a character class table entry. */
const charClass = (entry: CharClass): string =>
	`        private static readonly int[][] ${screaming(entry.name)} = { ${entry.ranges.map(([from, to]) => `new[] { 0x${from.toString(16)}, 0x${to.toString(16)} }`).join(", ")} };`;

/** Renders a compiled pattern table entry. */
const pattern = (entry: PatternDecl): string =>
	`        private static readonly PatternStep[] ${screaming(entry.name)} =\n        {\n${entry.steps
		.map(
			(step) =>
				`            new PatternStep(${screaming(step.charClass)}, ${step.min}, ${step.max}, ${step.capture}),`,
		)
		.join("\n")}\n        };`;

/** Renders an options record. */
const struct = (entry: StructDecl): string => {
	const fields = entry.fields
		.map(
			(field) =>
				`${field.doc === "" ? "" : `        /// <summary>${field.doc}</summary>\n`}        public ${type(field.ty)}${entry.isOptions ? "?" : ""} ${pascal(field.name)} { get; set; }`,
		)
		.join("\n\n");
	// An options record is filled in property by property; a value record is built in one go.
	const constructor = entry.isOptions
		? ""
		: `\n\n        public ${entry.name}(${entry.fields
				.map((field) => `${type(field.ty)} ${field.name}`)
				.join(", ")})\n        {\n${entry.fields
				.map((field) => `            ${pascal(field.name)} = ${field.name};`)
				.join("\n")}\n        }`;

	return `    /// <summary>${entry.doc}</summary>
    public sealed class ${entry.name}
    {
${fields}${constructor}
    }`;
};

/** Renders a dataset as the tables the runtime materialises, chunked so no method carries
 * the whole thing. */
const data = (entry: DataDecl): string => {
	const name = pascal(entry.name.toLowerCase());
	const rowChunks = chunks(
		entry.rows.map(
			(row, index) => `            rows[${index}] = new[] { ${row.map((cell) => lit(cell)).join(", ")} };`,
		),
		200,
	);
	const keys = Object.keys(entry.groups);
	const groupChunks = chunks(
		keys.map(
			(key, index) => `            groups[${index}] = new[] { ${entry.groups[key].join(", ")} };`,
		),
		5,
	);

	return `        /// <summary>${entry.doc}</summary>
        private static readonly Dataset ${screaming(entry.name)} = new Dataset(
            ${name}Rows(), new[] { ${keys.map((key) => lit(key)).join(", ")} }, ${name}Groups(),
            new[] { ${entry.fullOrder.join(", ")} });

        private static string[][] ${name}Rows()
        {
            var rows = new string[${entry.rows.length}][];
${rowChunks.map((_, index) => `            ${name}Rows${index}(rows);`).join("\n")}
            return rows;
        }

${rowChunks
		.map(
			(chunk, index) =>
				`        private static void ${name}Rows${index}(string[][] rows)\n        {\n${chunk.join("\n")}\n        }`,
		)
		.join("\n\n")}

        private static int[][] ${name}Groups()
        {
            var groups = new int[${keys.length}][];
${groupChunks.map((_, index) => `            ${name}Groups${index}(groups);`).join("\n")}
            return groups;
        }

${groupChunks
		.map(
			(chunk, index) =>
				`        private static void ${name}Groups${index}(int[][] groups)\n        {\n${chunk.join("\n")}\n        }`,
		)
		.join("\n\n")}`;
};

/** Renders one function. */
const func = (entry: FuncDecl): string => {
	localTypes = new Map(entry.params.map((param) => [param.name, param.ty]));

	const params = entry.params
		.map(
			(param) =>
				`${type(param.ty.k === "opt" ? param.ty.of : param.ty)} ${safe(param.name)}${param.optional ? " = null" : ""}`,
		)
		.join(", ");
	const prologue = optionReads(entry)
		.map((read) => {
			const local = `${safe(read.target)}${pascal(read.field)}`;
			const fallback = read.expr.k === "optionField" ? expr(read.expr.fallback) : "null";
			const declared = read.expr.k === "optionField" && read.expr.ty.k === "bool" ? "bool" : "long";

			return `            ${declared} ${local} = ${fallback};\n            if (${safe(read.target)} != null && ${safe(read.target)}.${pascal(read.field)} != null)\n            {\n                ${local} = ${safe(read.target)}.${pascal(read.field)}.Value;\n            }`;
		})
		.join("\n");
	const doc = prose(entry.doc);
	const comment =
		doc === ""
			? ""
			: `        /// <summary>\n${doc
					.split("\n")
					.map((line) => `        /// ${line}`.trimEnd())
					.join("\n")}\n        /// </summary>\n`;

	return `${comment}        public static ${type(entry.ret)} ${pascal(entry.name)}(${params})
        {
${prologue === "" ? "" : `${prologue}\n`}${block(entry.body, "            ")}
        }`;
};

/**
 * Emits the C# target of one module.
 *
 * @param {Module} module - The compiled module.
 * @returns {Record<string, string>} The files, by path.
 */
export const emit = (module: Module): Record<string, string> => {
	structs = new Map(module.structs.map((entry) => [entry.name, entry]));
	verbatim = new Set([
		...module.charClasses.map((entry) => entry.name),
		...module.patterns.map((entry) => entry.name),
		...module.constants.map((entry) => entry.name),
		...module.data.map((entry) => entry.name),
	]);

	const className = pascal(module.name);
	const constants = module.constants
		.map((entry) =>
			entry.ty.k === "list"
				? `        private static readonly long[] ${screaming(entry.name)} = ${expr(entry.expr)};`
				: `        private const string ${screaming(entry.name)} = ${expr(entry.expr)};`,
		)
		.join("\n");

	return {
		"Runtime.cs": readFileSync(RUNTIME, "utf8"),
		"Bridge.csproj": `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>disable</Nullable>
    <AssemblyName>BrazilianUtilsBridge</AssemblyName>
    <RootNamespace>BrazilianUtils.Bridge</RootNamespace>
    <OutputType>Exe</OutputType>
  </PropertyGroup>
</Project>
`,
		[`${className}.cs`]: `// Code generated from spec/bridge/source/${module.name}.ts. DO NOT EDIT.

namespace ${NAMESPACE}
{
${module.structs.map((entry) => struct(entry)).join("\n\n")}

    /// <summary>${module.doc}</summary>
    public static class ${className}
    {
${module.charClasses.map((entry) => charClass(entry)).join("\n")}

${module.patterns.map((entry) => pattern(entry)).join("\n\n")}

${constants}

${module.data.map((entry) => data(entry)).join("\n\n")}

${module.functions.map((entry) => func(entry)).join("\n\n")}
    }
}
`,
	};
};
