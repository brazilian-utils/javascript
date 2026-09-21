/**
 * The Python backend.
 *
 * Python 3.9, standard library only, `typing` annotations that pass pyright in strict mode.
 * Comprehensions, builtins and early returns where they are the natural form; no code that
 * imitates Go or Rust. Integers are Python `int`, which is already arbitrary precision, so a
 * proven range never forces a different representation here.
 */

import { dirname, relative as relativePath } from "node:path";
import type { Backend, DriverEntry, SupportNeeds } from "../../backend/generate.ts";
import { ENGINE_VERSION } from "../../backend/generate.ts";
import type { TargetSpec } from "../../backend/lower.ts";
import type { Candidate } from "../../backend/select.ts";
import { LoweringTable, argIsAscii } from "../../backend/select.ts";
import { asciiString } from "../../backend/tast.ts";
import type { TExpr, TFunc, TModule, TRecord, TStmt } from "../../backend/tast.ts";
import type { CProgram } from "../../core/ir.ts";
import { printRegex } from "../../regex.ts";
import type { SemType } from "../../types.ts";
import type { Value } from "../../values.ts";
import { TRIM_CODE_POINTS } from "../../intrinsics/index.ts";

export const PYTHON_CONFIG = {
	baseline: "Python 3.9",
	fileExtension: ".py",
	dependencies: [] as string[],
	formatter: "ruff format",
	linters: ["ruff check", "pyright"],
};

export function pyType(type: SemType): string {
	switch (type.kind) {
		case "Bool":
			return "bool";
		case "Int":
		case "Decimal":
		case "CivilDate":
		case "Instant":
		case "Duration":
			return "int";
		case "Float":
			return "float";
		case "String":
			return "str";
		case "List":
			return `List[${pyType(type.elem)}]`;
		case "Option":
			return `Optional[${pyType(type.inner)}]`;
		case "Record":
			return type.name;
		case "Enum":
			return `Literal[${type.members.map((member) => JSON.stringify(member)).join(", ")}]`;
		case "Union":
			return type.name;
		case "Lambda":
			return `Callable[[${type.params.map(pyType).join(", ")}], ${pyType(type.ret)}]`;
		case "Void":
			return "None";
		case "Never":
			return "NoReturn";
		default: {
			const exhaustive: never = type;
			return exhaustive;
		}
	}
}


/** The body of a printed class, so a lowering can negate it. */
function classBody(printed: string): string {
	return printed.startsWith("[") && printed.endsWith("]") ? printed.slice(1, -1) : printed;
}

const raw = (text: string): TExpr => ({ kind: "raw", text });

function binary(op: string): Candidate["emit"] {
	return (args) => ({ kind: "binary", op, left: args[0]!, right: args[1]! });
}

const cheap = { alloc: "none", time: "constant" } as const;
const linear = { alloc: "none", time: "linear" } as const;
const allocating = { alloc: "one", time: "linear" } as const;
/** A pass that materializes the scalars of a string: correct everywhere, and the slowest option. */
const scalarPass = { alloc: "many", time: "linear" } as const;

function nonNegative(index: number) {
	return (args: readonly SemType[]): boolean => {
		const arg = args[index];
		return arg !== undefined && arg.kind === "Int" && arg.lo >= 0n;
	};
}

/** Inlines a single-expression lambda, which is what makes a comprehension readable. */
function comprehension(list: TExpr, lambda: TExpr, shape: "map" | "filter"): TExpr {
	if (lambda.kind === "lambda" && lambda.body.length === 1 && lambda.body[0]!.kind === "return") {
		const body = lambda.body[0]!.value!;
		const name = lambda.params[0]!.name;
		return shape === "map"
			? raw(`[${print(body)} for ${name} in ${print(list)}]`)
			: raw(`[${name} for ${name} in ${print(list)} if ${print(body)}]`);
	}
	return shape === "map"
		? raw(`[__fn(__item) for __item in ${print(list)}]`.replace("__fn", print(lambda)))
		: raw(`[__item for __item in ${print(list)} if ${print(lambda)}(__item)]`);
}

function generatorOf(list: TExpr, lambda: TExpr): { name: string; test: string; list: string } {
	if (lambda.kind === "lambda" && lambda.body.length === 1 && lambda.body[0]!.kind === "return") {
		return {
			name: lambda.params[0]!.name,
			test: print(lambda.body[0]!.value!),
			list: print(list),
		};
	}
	return { name: "__item", test: `${print(lambda)}(__item)`, list: print(list) };
}

export const PYTHON_CANDIDATES: readonly Candidate[] = [
	...["add:+", "sub:-", "mul:*"].map((entry) => {
		const [op, symbol] = entry.split(":") as [string, string];
		return { op: `int.${op}`, impl: "native" as const, cost: cheap, emit: binary(symbol) };
	}),
	...["add:+", "sub:-", "mul:*", "div:/"].map((entry) => {
		const [op, symbol] = entry.split(":") as [string, string];
		return { op: `float.${op}`, impl: "native" as const, cost: cheap, emit: binary(symbol) };
	}),
	{
		op: "int.div",
		impl: "native",
		requires: (args) => nonNegative(0)(args) && nonNegative(1)(args),
		because: "`//` floors, so it only matches truncated division when both operands are non-negative",
		cost: cheap,
		emit: binary("//"),
	},
	{
		op: "int.div",
		impl: "library",
		cost: cheap,
		deps: ["_support"],
		emit: (args, _types, ctx) => {
			ctx.require("_support");
			return raw(`trunc_div(${print(args[0]!)}, ${print(args[1]!)})`);
		},
	},
	{
		op: "int.mod",
		impl: "native",
		requires: (args) => nonNegative(0)(args) && nonNegative(1)(args),
		because: "`%` is floored in Python, so it only matches the Core's truncated remainder for non-negative operands",
		cost: cheap,
		emit: binary("%"),
	},
	{
		op: "int.mod",
		impl: "library",
		cost: cheap,
		deps: ["_support"],
		emit: (args, _types, ctx) => {
			ctx.require("_support");
			return raw(`trunc_mod(${print(args[0]!)}, ${print(args[1]!)})`);
		},
	},
	{ op: "int.neg", impl: "native", cost: cheap, emit: (args) => raw(`-${print(args[0]!)}`) },
	{ op: "float.neg", impl: "native", cost: cheap, emit: (args) => raw(`-${print(args[0]!)}`) },
	{ op: "int.abs", impl: "native", cost: cheap, emit: (args) => raw(`abs(${print(args[0]!)})`) },
	{ op: "int.min", impl: "native", cost: cheap, emit: (args) => raw(`min(${print(args[0]!)}, ${print(args[1]!)})`) },
	{ op: "int.max", impl: "native", cost: cheap, emit: (args) => raw(`max(${print(args[0]!)}, ${print(args[1]!)})`) },
	...["lt:<", "le:<=", "gt:>", "ge:>="].flatMap((entry) => {
		const [op, symbol] = entry.split(":") as [string, string];
		return [
			{ op: `int.${op}`, impl: "native" as const, cost: cheap, emit: binary(symbol) },
			{ op: `float.${op}`, impl: "native" as const, cost: cheap, emit: binary(symbol) },
		];
	}),
	{ op: "float.fromInt", impl: "native", cost: cheap, emit: (args) => raw(`float(${print(args[0]!)})`) },
	{ op: "core.eq", impl: "native", cost: cheap, emit: binary("==") },

	{ op: "opt.isNone", impl: "native", cost: cheap, emit: (args) => raw(`${print(args[0]!)} is None`) },
	{ op: "opt.unwrap", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{ op: "opt.some", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{
		op: "opt.orElse",
		impl: "native",
		cost: cheap,
		emit: (args) => raw(`(${print(args[0]!)} if ${print(args[0]!)} is not None else ${print(args[1]!)})`),
	},

	{
		op: "str.len",
		impl: "native",
		because: "`len` counts code points in Python, which is the Core's definition",
		cost: cheap,
		emit: (args) => raw(`len(${print(args[0]!)})`),
	},
	{ op: "str.concat", impl: "native", cost: allocating, emit: binary("+") },
	{
		op: "str.codeAt",
		impl: "native",
		requires: argIsAscii(0),
		cost: cheap,
		because: "indexing by scalar is O(1) and identical to the Core only for ASCII",
		emit: (args) => raw(`ord(${print(args[0]!)}[${print(args[1]!)}])`),
	},
	{
		op: "str.charAt",
		impl: "native",
		requires: argIsAscii(0),
		cost: cheap,
		emit: (args) => raw(`${print(args[0]!)}[${print(args[1]!)}]`),
	},
	{
		op: "str.codeAtOpt",
		impl: "native",
		requires: argIsAscii(0),
		cost: cheap,
		emit: (args) =>
			raw(
				`(ord(${print(args[0]!)}[${print(args[1]!)}]) if 0 <= ${print(args[1]!)} < len(${print(args[0]!)}) else None)`,
			),
	},
	{
		op: "str.charAtOpt",
		impl: "native",
		requires: argIsAscii(0),
		cost: cheap,
		emit: (args) =>
			raw(
				`(${print(args[0]!)}[${print(args[1]!)}] if 0 <= ${print(args[1]!)} < len(${print(args[0]!)}) else None)`,
			),
	},
	{
		op: "str.slice",
		impl: "native",
		requires: argIsAscii(0),
		cost: allocating,
		emit: (args) => raw(`${print(args[0]!)}[${print(args[1]!)}:${print(args[2]!)}]`),
	},
	{ op: "str.indexOf", impl: "native", requires: argIsAscii(0), cost: linear, emit: (args) => raw(`${print(args[0]!)}.find(${print(args[1]!)})`) },
	{ op: "str.contains", impl: "native", cost: linear, emit: (args) => raw(`(${print(args[1]!)} in ${print(args[0]!)})`) },
	{ op: "str.startsWith", impl: "native", cost: linear, emit: (args) => raw(`${print(args[0]!)}.startswith(${print(args[1]!)})`) },
	{ op: "str.endsWith", impl: "native", cost: linear, emit: (args) => raw(`${print(args[0]!)}.endswith(${print(args[1]!)})`) },
	{ op: "str.repeat", impl: "native", cost: allocating, emit: binary("*") },
	{ op: "str.padStart", impl: "native", cost: allocating, emit: (args) => raw(`${print(args[0]!)}.rjust(${print(args[1]!)}, ${print(args[2]!)})`) },
	{
		op: "str.trim",
		impl: "native",
		because: "`strip()` uses Python's own whitespace set, so the 25 code points are passed explicitly",
		cost: allocating,
		emit: (args) => raw(`${print(args[0]!)}.strip(${asciiString(TRIM_CODE_POINTS.map((point) => String.fromCodePoint(point)).join(""))})`),
	},
	{ op: "str.asciiUpper", impl: "native", requires: argIsAscii(0), because: "`upper()` is only ASCII-equivalent on ASCII input", cost: allocating, emit: (args) => raw(`${print(args[0]!)}.upper()`) },
	{ op: "str.asciiLower", impl: "native", requires: argIsAscii(0), because: "`lower()` is only ASCII-equivalent on ASCII input", cost: allocating, emit: (args) => raw(`${print(args[0]!)}.lower()`) },
	{
		op: "str.asciiUpper",
		impl: "native",
		because: "one re.sub pass maps a-z and leaves every other scalar alone",
		cost: allocating,
		deps: ["re"],
		emit: (args, _types, ctx) => {
			ctx.require("re");
			return raw(`re.sub("[a-z]", lambda match: match.group().upper(), ${print(args[0]!)})`);
		},
	},
	{
		op: "str.asciiLower",
		impl: "native",
		because: "one re.sub pass maps A-Z and leaves every other scalar alone",
		cost: allocating,
		deps: ["re"],
		emit: (args, _types, ctx) => {
			ctx.require("re");
			return raw(`re.sub("[A-Z]", lambda match: match.group().lower(), ${print(args[0]!)})`);
		},
	},
	{
		op: "str.compare",
		impl: "native",
		because: "Python compares strings by code point, which is the Core's order",
		cost: linear,
		emit: (args) => raw(`(-1 if ${print(args[0]!)} < ${print(args[1]!)} else (1 if ${print(args[0]!)} > ${print(args[1]!)} else 0))`),
	},
	{ op: "str.codePoints", impl: "native", cost: allocating, emit: (args) => raw(`[ord(__c) for __c in ${print(args[0]!)}]`) },
	{ op: "str.fromCodePoints", impl: "native", cost: allocating, emit: (args) => raw(`"".join(chr(__p) for __p in ${print(args[0]!)})`) },
	{ op: "str.asAscii", impl: "native", cost: linear, emit: (args) => raw(`(${print(args[0]!)} if ${print(args[0]!)}.isascii() else None)`) },
	{ op: "str.asDigits", impl: "native", cost: linear, emit: (args) => raw(`(${print(args[0]!)} if (${print(args[0]!)} != "" and all("0" <= __c <= "9" for __c in ${print(args[0]!)})) else None)`) },
	{ op: "str.split", impl: "native", cost: allocating, emit: (args) => raw(`${print(args[0]!)}.split(${print(args[1]!)})`) },
	{ op: "str.join", impl: "native", cost: allocating, emit: (args) => raw(`${print(args[1]!)}.join(${print(args[0]!)})`) },
	{ op: "str.fromInt", impl: "native", cost: allocating, emit: (args) => raw(`str(${print(args[0]!)})`) },
	{
		op: "str.parseInt",
		impl: "native",
		cost: linear,
		emit: (args) => raw(`(int(${print(args[0]!)}) if (${print(args[0]!)} != "" and len(${print(args[0]!)}) <= 18 and all("0" <= __c <= "9" for __c in ${print(args[0]!)})) else None)`),
	},

	{
		op: "seq.at",
		impl: "native",
		cost: cheap,
		emit: (args) => raw(`(${print(args[0]!)}[${print(args[1]!)}] if 0 <= ${print(args[1]!)} < len(${print(args[0]!)}) else None)`),
	},
	{
		op: "str.asciiUpper",
		impl: "portable",
		// Building a scalar list costs far more than the host's own pass, which is why the cost
		// class has to say so: selection ranks by cost before it ranks by implementation kind.
		cost: scalarPass,
		sourceFn: "std/strings::asciiUpperAll",
		emit: (args, _types, ctx) => raw(`${ctx.nameOf("std/strings::asciiUpperAll")}(${print(args[0]!)})`),
	},
	{
		op: "str.asciiLower",
		impl: "portable",
		cost: scalarPass,
		sourceFn: "std/strings::asciiLowerAll",
		emit: (args, _types, ctx) => raw(`${ctx.nameOf("std/strings::asciiLowerAll")}(${print(args[0]!)})`),
	},
	{ op: "seq.len", impl: "native", cost: cheap, emit: (args) => raw(`len(${print(args[0]!)})`) },
	{ op: "seq.get", impl: "native", cost: cheap, emit: (args) => raw(`${print(args[0]!)}[${print(args[1]!)}]`) },
	{ op: "seq.push", impl: "native", cost: cheap, emit: (args) => raw(`${print(args[0]!)}.append(${print(args[1]!)})`) },
	{ op: "seq.map", impl: "native", because: "a comprehension is the idiomatic map", cost: allocating, emit: (args) => comprehension(args[0]!, args[1]!, "map") },
	{ op: "seq.filter", impl: "native", cost: allocating, emit: (args) => comprehension(args[0]!, args[1]!, "filter") },
	{
		op: "seq.any",
		impl: "native",
		cost: linear,
		emit: (args) => {
			const gen = generatorOf(args[0]!, args[1]!);
			return raw(`any(${gen.test} for ${gen.name} in ${gen.list})`);
		},
	},
	{
		op: "seq.all",
		impl: "native",
		cost: linear,
		emit: (args) => {
			const gen = generatorOf(args[0]!, args[1]!);
			return raw(`all(${gen.test} for ${gen.name} in ${gen.list})`);
		},
	},
	{
		op: "seq.find",
		impl: "native",
		cost: linear,
		emit: (args) => {
			const gen = generatorOf(args[0]!, args[1]!);
			return raw(`next((${gen.name} for ${gen.name} in ${gen.list} if ${gen.test}), None)`);
		},
	},
	{ op: "seq.sum", impl: "native", because: "`sum` is the idiomatic fold over +", cost: linear, emit: (args) => raw(`sum(${print(args[0]!)})`) },
	{ op: "seq.indexOf", impl: "native", cost: linear, emit: (args) => raw(`(${print(args[0]!)}.index(${print(args[1]!)}) if ${print(args[1]!)} in ${print(args[0]!)} else -1)`) },
	{ op: "seq.contains", impl: "native", cost: linear, emit: (args) => raw(`(${print(args[1]!)} in ${print(args[0]!)})`) },
	{ op: "seq.concat", impl: "native", cost: allocating, emit: binary("+") },
	{ op: "seq.slice", impl: "native", cost: allocating, emit: (args) => raw(`${print(args[0]!)}[${print(args[1]!)}:${print(args[2]!)}]`) },
	{ op: "seq.reverse", impl: "native", cost: allocating, emit: (args) => raw(`list(reversed(${print(args[0]!)}))`) },
	{
		op: "seq.sortStable",
		impl: "library",
		because: "`sorted` is stable; a comparator goes through functools.cmp_to_key",
		cost: { alloc: "one", time: "nlogn" },
		deps: ["functools"],
		emit: (args, _types, ctx) => {
			ctx.require("functools");
			return raw(`sorted(${print(args[0]!)}, key=functools.cmp_to_key(${print(args[1]!)}))`);
		},
	},
	{
		op: "seq.sortStableBy",
		impl: "native",
		because: "`sorted(key=…)` is stable and avoids the comparator wrapper",
		cost: { alloc: "one", time: "nlogn" },
		emit: (args) => raw(`sorted(${print(args[0]!)}, key=${print(args[1]!)})`),
	},

	{ op: "dec.fromScaled", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{ op: "dec.fromInt", impl: "native", cost: cheap, emit: (args, types) => raw(`${print(args[0]!)} * ${10 ** scaleOf(types[1])}`) },
	{ op: "dec.add", impl: "native", cost: cheap, emit: binary("+") },
	{ op: "dec.sub", impl: "native", cost: cheap, emit: binary("-") },
	{ op: "dec.mul", impl: "native", cost: cheap, emit: binary("*") },
	{ op: "dec.compare", impl: "native", cost: cheap, emit: (args) => raw(`(-1 if ${print(args[0]!)} < ${print(args[1]!)} else (1 if ${print(args[0]!)} > ${print(args[1]!)} else 0))`) },
	{ op: "dec.isNegative", impl: "native", cost: cheap, emit: (args) => raw(`${print(args[0]!)} < 0`) },
	{ op: "dec.abs", impl: "native", cost: cheap, emit: (args) => raw(`abs(${print(args[0]!)})`) },
	{ op: "dec.unscaled", impl: "native", cost: cheap, emit: (args) => args[0]! },

	{
		op: "date.clampEpochDays",
		impl: "native",
		cost: cheap,
		emit: (args) => raw(`min(max(${print(args[0]!)}, -719162), 2932896)`),
	},
	{ op: "date.toEpochDays", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{
		op: "date.fromEpochDays",
		impl: "native",
		cost: cheap,
		emit: (args) => raw(`(${print(args[0]!)} if -719162 <= ${print(args[0]!)} <= 2932896 else None)`),
	},
	{
		op: "date.fromYmd",
		impl: "portable",
		cost: linear,
		sourceFn: "std/date::ymdToDays",
		emit: (args, _types, ctx) => raw(`${ctx.nameOf("std/date::ymdToDays")}(${args.map(print).join(", ")})`),
	},
	{ op: "date.year", impl: "portable", cost: cheap, sourceFn: "std/date::yearFromDays", emit: (args, _types, ctx) => raw(`${ctx.nameOf("std/date::yearFromDays")}(${print(args[0]!)})`) },
	{ op: "date.month", impl: "portable", cost: cheap, sourceFn: "std/date::monthFromDays", emit: (args, _types, ctx) => raw(`${ctx.nameOf("std/date::monthFromDays")}(${print(args[0]!)})`) },
	{ op: "date.day", impl: "portable", cost: cheap, sourceFn: "std/date::dayFromDays", emit: (args, _types, ctx) => raw(`${ctx.nameOf("std/date::dayFromDays")}(${print(args[0]!)})`) },
	{
		op: "date.addDays",
		impl: "native",
		cost: cheap,
		emit: (args) => raw(`(${print(args[0]!)} + ${print(args[1]!)} if -719162 <= ${print(args[0]!)} + ${print(args[1]!)} <= 2932896 else None)`),
	},
	{ op: "date.diffDays", impl: "native", cost: cheap, emit: binary("-") },
	{ op: "date.compare", impl: "native", cost: cheap, emit: (args) => raw(`(-1 if ${print(args[0]!)} < ${print(args[1]!)} else (1 if ${print(args[0]!)} > ${print(args[1]!)} else 0))`) },
	{ op: "date.dayOfWeek", impl: "native", cost: cheap, emit: (args) => raw(`((${print(args[0]!)} + 3) % 7) + 1`) },
	{ op: "date.isLeapYear", impl: "native", cost: cheap, emit: (args) => raw(`((${print(args[0]!)} % 4 == 0 and ${print(args[0]!)} % 100 != 0) or ${print(args[0]!)} % 400 == 0)`) },

	{
		op: "re.retain",
		impl: "native",
		because: "re.sub with the negated class is one pass",
		cost: allocating,
		deps: ["re"],
		emit: (args, _types, ctx) => {
			ctx.require("re");
			const pattern = ctx.regex === undefined ? "" : printRegex(ctx.regex.node, "python");
			return raw(`re.sub(${asciiString(`[^${classBody(pattern)}]`)}, "", ${print(args[0]!)})`);
		},
	},
	{
		op: "re.test",
		impl: "native",
		because: "`fullmatch` anchors the whole string, and the normalized pattern uses explicit classes",
		cost: linear,
		deps: ["re"],
		emit: (args, _types, ctx) => {
			ctx.require("re");
			const pattern = ctx.regex === undefined ? "" : printRegex(ctx.regex.node, "python");
			return raw(`(re.fullmatch(${pythonPattern(pattern)}, ${print(args[0]!)}) is not None)`);
		},
	},

	{
		op: "http.request",
		impl: "native",
		cost: { alloc: "many", time: "linear" },
		emit: (args, _types, ctx) => raw(`${print(ctx.env())}.request(${print(args[0]!)})`),
	},
	{ op: "clock.now", impl: "native", cost: cheap, emit: (_args, _types, ctx) => raw(`${print(ctx.env())}.now()`) },
	{ op: "clock.sleep", impl: "native", cost: cheap, emit: (args, _types, ctx) => raw(`${print(ctx.env())}.sleep(${print(args[0]!)})`) },
	{ op: "clock.millis", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{ op: "clock.durationMillis", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{ op: "clock.elapsed", impl: "native", cost: cheap, emit: (args) => raw(`max(0, ${print(args[1]!)} - ${print(args[0]!)})`) },
	{ op: "random.nextU32", impl: "native", cost: cheap, emit: (_args, _types, ctx) => raw(`${print(ctx.env())}.next_u32()`) },
	{
		op: "task.race",
		impl: "library",
		because: "a ThreadPoolExecutor is the standard library's way to run idempotent requests concurrently",
		cost: { alloc: "many", time: "linear" },
		deps: ["_support"],
		emit: (args, _types, ctx) => {
			ctx.require("_support");
			return raw(`race_first_some(${print(args[0]!)})`);
		},
	},
];

function scaleOf(type: SemType | undefined): number {
	return type !== undefined && type.kind === "Int" ? Number(type.lo) : 0;
}

/**
 * The pattern is emitted as an ordinary (escaped) Python string, not a raw one: the normalized
 * form already contains backslash escapes, and JSON escaping turns each of them into the two
 * characters the `re` module expects to read.
 */
function pythonPattern(pattern: string): string {
	return asciiString(pattern);
}

export const PYTHON_SPEC: TargetSpec = {
	name: "python",
	table: new LoweringTable(PYTHON_CANDIDATES),
	naming: {
		func: (name) => snake(name),
		value: (name) => snake(name),
		field: (name) => snake(name),
		type: (name) => name,
		module: (path) => `${path.split("/").map(snake).join("/")}.py`,
	},
	// A fold is a loop in Python: the comprehension forms cover map and filter, and
	// `functools.reduce` is not idiomatic.
	loopCombinators: new Set(["seq.fold"]),
	statementTernary: false,
	errorsAsValues: false,
	asyncColouring: false,
	envType: { kind: "Record", name: "Capabilities" },
};

function snake(name: string): string {
	return name
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.replaceAll("-", "_")
		.toLowerCase();
}

/* ------------------------------------------------------------------ *
 * Printer
 * ------------------------------------------------------------------ */

export function print(expr: TExpr): string {
	switch (expr.kind) {
		case "lit":
			return literal(expr.value);
		case "name":
			return expr.name;
		case "raw":
			return expr.text;
		case "call":
			return `${print(expr.callee)}(${expr.args.map(print).join(", ")})`;
		case "method":
			return `${print(expr.target)}.${snake(expr.name)}(${expr.args.map(print).join(", ")})`;
		case "member":
			return `${print(expr.target)}.${expr.name}`;
		case "index":
			return `${print(expr.target)}[${print(expr.index)}]`;
		case "binary":
			return `(${print(expr.left)} ${pythonOperator(expr.op)} ${print(expr.right)})`;
		case "unary": {
			if (expr.op === "!" && expr.operand.kind === "binary" && expr.operand.op === "==") {
				return `(${print(expr.operand.left)} != ${print(expr.operand.right)})`;
			}
			return expr.op === "!" ? `(not ${print(expr.operand)})` : `${expr.op}${print(expr.operand)}`;
		}
		case "ternary":
			return `(${print(expr.then)} if ${print(expr.test)} else ${print(expr.otherwise)})`;
		case "list":
			return `[${expr.items.map(print).join(", ")}]`;
		case "record":
			return `${expr.typeName}(${expr.fields.map((field) => `${snake(field.name)}=${print(field.value)}`).join(", ")})`;
		case "lambda": {
			const params = expr.params.map((param) => param.name).join(", ");
			if (expr.body.length === 1 && expr.body[0]!.kind === "return" && expr.body[0]!.value !== undefined) {
				return `(lambda ${params}: ${print(expr.body[0]!.value!)})`;
			}
			return `(lambda ${params}: None)`;
		}
		case "none":
		case "zero":
			return "None";
		case "some":
			return print(expr.inner);
		default: {
			const exhaustive: never = expr;
			return exhaustive;
		}
	}
}

function pythonOperator(op: string): string {
	switch (op) {
		case "&&":
			return "and";
		case "||":
			return "or";
		case "===":
			return "==";
		case "!==":
			return "!=";
		default:
			return op;
	}
}

function literal(value: Value): string {
	if (typeof value === "bigint") return value.toString();
	if (typeof value === "string") return asciiString(value);
	if (typeof value === "boolean") return value ? "True" : "False";
	if (typeof value === "number") return String(value);
	if (Array.isArray(value)) return `[${value.map(literal).join(", ")}]`;
	return "None";
}

function printBody(body: readonly TStmt[], depth: number): string {
	if (body.length === 0) return `${"    ".repeat(depth)}pass`;
	return body.map((statement) => printStmt(statement, depth)).join("\n");
}

function printStmt(statement: TStmt, depth: number): string {
	const pad = "    ".repeat(depth);
	switch (statement.kind) {
		case "let":
			return `${pad}${statement.name}: ${pyType(statement.type)} = ${print(statement.init)}`;
		case "multiLet":
			return `${pad}${statement.names.join(", ")} = ${print(statement.init)}`;
		case "assign":
			return `${pad}${print(statement.target)} = ${print(statement.value)}`;
		case "if": {
			const head = `${pad}if ${print(statement.test)}:\n${printBody(statement.then, depth + 1)}`;
			return statement.otherwise.length === 0
				? head
				: `${head}\n${pad}else:\n${printBody(statement.otherwise, depth + 1)}`;
		}
		case "switch": {
			const branches = statement.cases.map((entry, index) => {
				const test = entry.values
					.map((value) => `${print(statement.subject)} == ${literal(value)}`)
					.join(" or ");
				return `${pad}${index === 0 ? "if" : "elif"} ${test}:\n${printBody(entry.body, depth + 1)}`;
			});
			if (statement.otherwise !== undefined) {
				branches.push(`${pad}else:\n${printBody(statement.otherwise, depth + 1)}`);
			}
			return branches.join("\n");
		}
		case "for": {
			const step = statement.step;
			const to = print(statement.to);
			const bound = statement.inclusive
				? step > 0n
					? `${to} + 1`
					: `${to} - 1`
				: to;
			const stepArg = step === 1n ? "" : `, ${step}`;
			return `${pad}for ${statement.name} in range(${print(statement.from)}, ${bound}${stepArg}):\n${printBody(statement.body, depth + 1)}`;
		}
		case "forEach":
			return `${pad}for ${statement.name} in ${print(statement.iterable)}:\n${printBody(statement.body, depth + 1)}`;
		case "return":
			return statement.value === undefined ? `${pad}return` : `${pad}return ${print(statement.value)}`;
		case "throw":
			return `${pad}raise ${statement.errorClass}(${statement.args.map(print).join(", ")})`;
		case "break":
			return `${pad}break`;
		case "continue":
			return `${pad}continue`;
		case "expr":
			return `${pad}${print(statement.expr)}`;
		case "raw":
			return `${pad}${statement.text}`;
		default: {
			const exhaustive: never = statement;
			return exhaustive;
		}
	}
}

/** A docstring whose backslashes survive: a plain Python string reads `\\u` as an escape. */
function docstring(text: string): string {
	const first = text
		.split("\n")[0]!
		.replaceAll("\\", "\\\\")
		.replaceAll(TRIPLE_QUOTE, "'''");
	return `${TRIPLE_QUOTE}${first}${TRIPLE_QUOTE}`;
}

const TRIPLE_QUOTE = '"'.repeat(3);

export function printFunction(fn: TFunc): string {
	const params = fn.params.map((param) => `${param.name}: ${pyType(param.type)}`).join(", ");
	const doc = fn.doc === undefined ? "" : `    ${docstring(fn.doc)}\n`;
	return `def ${fn.name}(${params}) -> ${pyType(fn.ret)}:\n${doc}${printBody(fn.body, 1)}`;
}

export function printRecord(record: TRecord): string {
	const fields = record.fields.map((field) => `    ${snake(field.name)}: ${pyType(field.type)}`).join("\n");
	const doc = record.doc === undefined ? "" : `    ${docstring(record.doc)}\n`;
	return `@dataclass(frozen=True)\nclass ${record.name}:\n${doc}${fields}`;
}

export function printModule(module: TModule): string {
	const typingNames = new Set<string>();
	const text = module.functions
		.map(printFunction)
		.join("\n\n\n")
		// Module level constants are upper cased, the way Python names a constant.
		.replaceAll(/\btable(\d+)\b/gu, (name) => name.toUpperCase());
	const records = module.records.map(printRecord).join("\n\n\n");
	for (const name of ["List", "Optional", "Literal", "Callable", "NoReturn"]) {
		if (new RegExp(`\\b${name}\\[`).test(`${text}${records}`) || text.includes(`-> ${name}`)) {
			typingNames.add(name);
		}
	}
	const parts: string[] = [module.header, ""];
	if (typingNames.size > 0) parts.push(`from typing import ${[...typingNames].sort().join(", ")}`);
	if (records !== "") parts.push("from dataclasses import dataclass");
	for (const name of module.requires) {
		if (name !== "_support") {
			parts.push(`import ${name}`);
			continue;
		}
		// `_support` lives at the package root, so a nested module walks back up to it.
		const dots = ".".repeat(module.sourcePath.split("/").length);
		const used = ["trunc_div", "trunc_mod", "race_first_some"].filter((helper) =>
			new RegExp(`\\b${helper}\\(`).test(text),
		);
		if (used.length > 0) parts.push(`from ${dots}_support import ${used.join(", ")}`);
	}
	for (const item of module.imports) {
		if (item.from === "SUPPORT") {
			const dots = ".".repeat(module.sourcePath.split("/").length);
			parts.push(`from ${dots}_support import ${item.names.join(", ")}`);
			continue;
		}
		// Classes keep their name; functions are snake cased like everything else.
		parts.push(
			`from ${item.from} import ${item.names.map((name) => (/^[A-Z]/.test(name) ? name : snake(name))).join(", ")}`,
		);
	}
	parts.push("");
	if (records !== "") parts.push(records, "");
	for (const constant of module.constants) {
		parts.push(`${constant.name.toUpperCase()}: ${pyType(constant.type)} = ${print(constant.value)}`, "");
	}
	parts.push(text);
	return `${parts.join("\n").trimEnd()}\n`;
}

function importPath(from: string, to: string): string {
	const rel = relativePath(dirname(from) === "." ? "" : dirname(from), to).split("\\").join("/");
	const dots = rel.startsWith("..") ? ".." : ".";
	return `${dots}${rel.replaceAll("../", "").split("/").map(snake).join(".")}`;
}

function supportModule(_program: CProgram, needs: SupportNeeds): { path: string; text: string } | undefined {
	const parts = [
		"# Code generated by the logic engine. DO NOT EDIT.",
		`# engine: ${ENGINE_VERSION}`,
		"# source: _support",
		"",
		"from dataclasses import dataclass",
		"from typing import Callable, List, Optional, Sequence, TypeVar",
		"",
		"T = TypeVar(\"T\")",
		"",
		"",
		"def trunc_div(left: int, right: int) -> int:",
		'    """Truncated division: the Core rounds toward zero, Python floors."""',
		"    quotient = abs(left) // abs(right)",
		"    return -quotient if (left < 0) != (right < 0) else quotient",
		"",
		"",
		"def trunc_mod(left: int, right: int) -> int:",
		'    """Remainder with the sign of the dividend, as in JavaScript, Go, Java and C#."""',
		"    remainder = abs(left) % abs(right)",
		"    return -remainder if left < 0 else remainder",
		"",
	];
	if (needs.race) {
		parts.push(
			"",
			"def race_first_some(tasks: Sequence[Callable[[], Optional[T]]]) -> Optional[T]:",
			"    from concurrent.futures import ThreadPoolExecutor, as_completed",
			"",
			"    with ThreadPoolExecutor(max_workers=max(1, len(tasks))) as pool:",
			"        futures = [pool.submit(task) for task in tasks]",
			"",
			"        for future in as_completed(futures):",
			"            try:",
			"                return future.result()",
			"            except Exception:",
			"                continue",
			"",
			"    return None",
			"",
		);
	}
	if (needs.env) {
		parts.push(
			"",
			"@dataclass(frozen=True)",
			"class HttpHeader:",
			"    name: str",
			"    value: str",
			"",
			"",
			"@dataclass(frozen=True)",
			"class HttpRequest:",
			"    method: str",
			"    url: str",
			"    headers: List[HttpHeader]",
			"    body: str",
			"    timeout_millis: int",
			"",
			"",
			"@dataclass(frozen=True)",
			"class HttpResponse:",
			"    status: int",
			"    headers: List[HttpHeader]",
			"    body: str",
			"",
			"",
			"class Capabilities:",
			'    """The default environment, built from the standard library only."""',
			"",
			"    def request(self, request: HttpRequest) -> Optional[HttpResponse]:",
			"        import json",
			"        import urllib.error",
			"        import urllib.request",
			"",
			"        payload = None if request.body == \"\" else request.body.encode()",
			"        parsed = urllib.request.Request(request.url, data=payload, method=request.method)",
			"",
			"        for header in request.headers:",
			"            parsed.add_header(header.name, header.value)",
			"",
			"        try:",
			"            with urllib.request.urlopen(parsed, timeout=request.timeout_millis / 1000) as response:",
			"                return HttpResponse(status=response.status, headers=[], body=response.read().decode())",
			"        except urllib.error.HTTPError as error:",
			"            return HttpResponse(status=error.code, headers=[], body=error.read().decode())",
			"        except Exception:",
			"            return None",
			"",
			"    def now(self) -> int:",
			"        import time",
			"",
			"        return int(time.time() * 1000)",
			"",
			"    def sleep(self, milliseconds: int) -> None:",
			"        import time",
			"",
			"        time.sleep(milliseconds / 1000)",
			"",
			"    def next_u32(self) -> int:",
			"        import secrets",
			"",
			"        return secrets.randbits(32)",
			"",
		);
	}
	return { path: "_support.py", text: parts.join("\n") };
}

function errorsModule(program: CProgram): { path: string; text: string } | undefined {
	const declared = [...program.errors.values()];
	if (declared.length === 0) return undefined;
	const lines = [
		"# Code generated by the logic engine. DO NOT EDIT.",
		`# engine: ${ENGINE_VERSION}`,
		"# source: errors",
		"",
		"",
		"class DomainError(Exception):",
		'    """The root of every domain error the core raises."""',
		"",
	];
	for (const error of declared) {
		lines.push(
			"",
			`class ${error.name}(${error.base ?? "DomainError"}):`,
			`    """${error.doc?.split("\n")[0] ?? error.name}"""`,
			"",
		);
	}
	return { path: "errors.py", text: lines.join("\n") };
}


/** The generated differential driver: one JSON line in, one JSON line out. */
function driverFiles(_program: CProgram, entries: readonly DriverEntry[]): { path: string; text: string }[] {
	const lines = [
		"# Code generated by the logic engine. DO NOT EDIT.",
		"# source: _driver",
		"",
		"import dataclasses",
		"import json",
		"import sys",
		"",
		"",
		"def encode(value: object) -> object:",
		'    """A generated record is a dataclass, which json.dumps does not know."""',
		"    if dataclasses.is_dataclass(value):",
		"        return dataclasses.asdict(value)",
		"    raise TypeError(value)",
		"",
	];
	const byModule = new Map<string, string[]>();
	for (const entry of entries) {
		const module = `.${entry.modulePath.replace(/\.py$/, "").split("/").join(".")}`;
		const names = byModule.get(module) ?? [];
		names.push(entry.targetName);
		byModule.set(module, names);
	}
	for (const [module, names] of byModule) {
		const records = entries
			.filter((entry) => `.${entry.modulePath.replace(/\.py$/, "").split("/").join(".")}` === module)
			.flatMap((entry) => entry.params.filter((param) => param.kind === "Record").map((param) => (param as { name: string }).name));
		lines.push(`from ${module} import ${[...new Set([...names, ...records])].sort().join(", ")}`);
	}
	const needsEnv = entries.some((entry) => entry.usesEnv);
	if (needsEnv) {
		lines.push(
			"import os",
			"import time",
			"from typing import Optional",
			"from ._support import Capabilities, HttpRequest, HttpResponse",
			"",
			"",
			"# The reference PCG32: same constants and default seed as the interpreter's, so a draw",
			"# matches the reference bit for bit. A fresh instance is built for every request, the same",
			"# way the reference model starts a fresh interpreter, and so a fresh generator, per case.",
			"class Pcg32:",
			"",
			"    MASK64 = (1 << 64) - 1",
			"    MASK32 = (1 << 32) - 1",
			"    INCREMENT = 1442695040888963407",
			"",
			"    def __init__(self, seed: int) -> None:",
			"        self.state = 0",
			"        self.next_u32()",
			"        self.state = (self.state + seed) & self.MASK64",
			"        self.next_u32()",
			"",
			"    def next_u32(self) -> int:",
			"        previous = self.state",
			"        self.state = (previous * 6364136223846793005 + self.INCREMENT) & self.MASK64",
			"        xorshifted = (((previous >> 18) ^ previous) >> 27) & self.MASK32",
			"        rotation = previous >> 59",
			"        return ((xorshifted >> rotation) | (xorshifted << ((-rotation) & 31))) & self.MASK32",
			"",
			"",
			"# The interpreter's own default: its constructor falls back to this seed whenever",
			"# `Capabilities.seed` is left unset, which is how every conformance case runs it.",
			"DEFAULT_SEED = 0x853C49E6748FEA9B",
			"",
			"",
			"class FakeCapabilities:",
			'    """The capability fake the differential harness drives: responses come from fixtures.json."""',
			"",
			"    def __init__(self, fixtures: dict) -> None:",
			"        self.fixtures = fixtures",
			"        self.random = Pcg32(DEFAULT_SEED)",
			"",
			"    def request(self, request: HttpRequest) -> Optional[HttpResponse]:",
			"        fixture = self.fixtures.get(request.url)",
			"",
			"        if fixture is None:",
			"            return None",
			"",
			'        time.sleep(fixture.get("latencyMillis", 0) / 1000)',
			"",
			'        return HttpResponse(status=fixture["status"], headers=[], body=fixture["body"])',
			"",
			"    def now(self) -> int:",
			"        return 0",
			"",
			"    def sleep(self, milliseconds: int) -> None:",
			"        time.sleep(milliseconds / 1000)",
			"",
			"    def next_u32(self) -> int:",
			"        return self.random.next_u32()",
			"",
			"",
			'FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "fixtures.json")',
			"",
			"if os.path.exists(FIXTURE_PATH):",
			"    with open(FIXTURE_PATH) as handle:",
			"        FIXTURES = json.load(handle)",
			"else:",
			"    FIXTURES = None",
		);
	}
	lines.push(
		"",
		"HANDLERS = {",
		...entries.map((entry) => {
			const args = entry.params.map((param, index) => {
				if (param.kind !== "Record") return `args[${index}]`;
				const definition = _program.records.get(param.name);
				const fields = (definition?.fields ?? [])
					.map((field) => `${snake(field.name)}=args[${index}][${JSON.stringify(field.name)}]`)
					.join(", ");
				return `${param.name}(${fields})`;
			});
			if (entry.usesEnv) args.push("ENVIRONMENT");
			return `    ${JSON.stringify(entry.coreName)}: lambda args: ${entry.targetName}(${args.join(", ")}),`;
		}),
		"}",
		"",
		"",
		"for line in sys.stdin:",
		'    if line.strip() == "":',
		"        continue",
		"",
		"    request = json.loads(line)",
		"",
		...(needsEnv
			? [
					"    # A fresh environment per line: next_u32 starts from the same state the reference",
					"    # model's fresh interpreter starts from for every case.",
					"    ENVIRONMENT = FakeCapabilities(FIXTURES) if FIXTURES is not None else Capabilities()",
					"",
				]
			: []),
		"    try:",
		'        value = HANDLERS[request["fn"]](request["args"])',
		'        print(json.dumps({"ok": True, "value": value}, default=encode))',
		"    except Exception as error:",
		'        print(json.dumps({"ok": False, "error": type(error).__name__}))',
		"",
		"    sys.stdout.flush()",
		"",
	);
	const packages = new Set<string>([""]);
	for (const fn of _program.functions.values()) {
		const parts = fn.module.split("/");
		for (let index = 1; index < parts.length; index++) {
			packages.add(parts.slice(0, index).map(snake).join("/"));
		}
	}
	return [
		{ path: "_driver.py", text: lines.join("\n") },
		...[...packages].map((directory) => ({
			path: directory === "" ? "__init__.py" : `${directory}/__init__.py`,
			text: "",
		})),
	];
}

export const PYTHON_BACKEND: Backend = {
	spec: PYTHON_SPEC,
	fileExtension: PYTHON_CONFIG.fileExtension,
	printModule,
	importPath,
	support: supportModule,
	errorsModule,
	renderType: pyType,
	comment: "#",
	driver: driverFiles,
	supportImport: (needs, usesEnv, builtins) => {
		const names = builtins.slice();
		if (usesEnv && needs.env) names.push("Capabilities");
		return [{ from: "SUPPORT", names: names.sort() }];
	},
};
