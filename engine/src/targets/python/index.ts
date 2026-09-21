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
import { asciiString, mapExprs } from "../../backend/tast.ts";
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

const NONE = raw("None");

/**
 * The name `opt.orElse` binds its value to when it cannot fuse into a checked lowering.
 *
 * One name serves every use: the walrus is evaluated in the condition, before either branch reads
 * it, so a nested `orElse` inside the value has already been read by the time the outer one
 * rebinds, and two siblings are evaluated one after the other.
 */
const ORELSE_TEMP = "__value";

/**
 * `value if test else None`, the shape every checked lowering takes in Python.
 *
 * It is a node rather than a string so `opt.orElse` can drop its default straight into the `else`
 * branch. Printed on its own it is exactly the text it replaced.
 */
function checked(value: string, test: string): TExpr {
	return { kind: "ternary", test: raw(test), then: raw(value), otherwise: NONE };
}

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
		// `trunc_div` (`_support.py`) is a Python-level function, and CPython's call overhead — a new
		// frame, argument binding, a `return` — costs more than the arithmetic it wraps; a modulo or
		// division whose operands are not provably non-negative pays that on every call, everywhere
		// in the generated program (`group_thousands`' per-character loop is one such caller, and
		// most of `formatCurrency`'s gap traced to it — `engine/docs/progress.md` §8). Printing the
		// same formula inline removes the call. The tuple's job is single evaluation: `left`/`right`
		// each appear once in the test (bound to `__td_a`/`__td_b`) and once more in whichever branch
		// the ternary actually takes, never twice in the same executed path, so a non-trivial operand
		// expression (not just a name) is still evaluated exactly once.
		op: "int.div",
		impl: "library",
		cost: cheap,
		emit: (args) => {
			const left = print(args[0]!);
			const right = print(args[1]!);
			return raw(
				`(-(abs(__td_a) // abs(__td_b)) if ((__td_a := ${left}), (__td_b := ${right}), (__td_a < 0) != (__td_b < 0))[2] else abs(__td_a) // abs(__td_b))`,
			);
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
		// Same reasoning as `int.div` above: `trunc_mod`'s own formula, inlined instead of called.
		op: "int.mod",
		impl: "library",
		cost: cheap,
		emit: (args) => {
			const left = print(args[0]!);
			const right = print(args[1]!);
			return raw(
				`(-(abs(__tm_a) % abs(__tm_b)) if ((__tm_a := ${left}), (__tm_b := ${right}), __tm_a < 0)[2] else abs(__tm_a) % abs(__tm_b))`,
			);
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

	// A `binary` rather than text, so negating it prints `is not None` instead of `not … is None`.
	{ op: "opt.isNone", impl: "native", cost: cheap, emit: (args) => ({ kind: "binary", op: "is", left: args[0]!, right: NONE }) },
	{ op: "opt.unwrap", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{ op: "opt.some", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{
		op: "opt.orElse",
		impl: "native",
		cost: cheap,
		emit: (args, types) => {
			const value = args[0]!;
			// A checked lowering already answers `value if test else None`, so the default belongs
			// in that `else` branch: the test runs once, and the result reads the way a Python
			// author would have written it. It is only the same expression while the value itself
			// can never be `None`, which an Option of an Option would break.
			if (value.kind === "ternary" && value.otherwise === NONE && types[0]?.kind === "Option" && types[0].inner.kind !== "Option") {
				return { kind: "ternary", test: value.test, then: value.then, otherwise: args[1]! };
			}
			// Anything else has to be named before it can be tested and then answered, or it would
			// be evaluated twice — for a call, that is the whole call run twice. One walrus binds
			// it; the condition is evaluated first, so the name always holds this value by the time
			// the branches read it, and a nested `orElse` rebinds it only after its own use.
			if (value.kind === "name" || value.kind === "lit" || value.kind === "member") {
				return raw(`(${print(value)} if ${print(value)} is not None else ${print(args[1]!)})`);
			}
			return raw(`(${ORELSE_TEMP} if (${ORELSE_TEMP} := ${print(value)}) is not None else ${print(args[1]!)})`);
		},
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
			checked(
				`ord(${print(args[0]!)}[${print(args[1]!)}])`,
				`0 <= ${print(args[1]!)} < len(${print(args[0]!)})`,
			),
	},
	{
		op: "str.charAtOpt",
		impl: "native",
		requires: argIsAscii(0),
		cost: cheap,
		emit: (args) =>
			checked(`${print(args[0]!)}[${print(args[1]!)}]`, `0 <= ${print(args[1]!)} < len(${print(args[0]!)})`),
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
	{ op: "str.asAscii", impl: "native", cost: linear, emit: (args) => checked(print(args[0]!), `${print(args[0]!)}.isascii()`) },
	{
		op: "str.asDigits",
		impl: "native",
		cost: linear,
		emit: (args) =>
			checked(
				print(args[0]!),
				`(${print(args[0]!)} != "" and all("0" <= __c <= "9" for __c in ${print(args[0]!)}))`,
			),
	},
	{ op: "str.split", impl: "native", cost: allocating, emit: (args) => raw(`${print(args[0]!)}.split(${print(args[1]!)})`) },
	{ op: "str.join", impl: "native", cost: allocating, emit: (args) => raw(`${print(args[1]!)}.join(${print(args[0]!)})`) },
	{ op: "str.fromInt", impl: "native", cost: allocating, emit: (args) => raw(`str(${print(args[0]!)})`) },
	{
		op: "str.parseInt",
		impl: "native",
		cost: linear,
		emit: (args) =>
			checked(
				`int(${print(args[0]!)})`,
				`(${print(args[0]!)} != "" and len(${print(args[0]!)}) <= 18 and all("0" <= __c <= "9" for __c in ${print(args[0]!)}))`,
			),
	},

	{
		op: "seq.at",
		impl: "native",
		cost: cheap,
		emit: (args) =>
			checked(`${print(args[0]!)}[${print(args[1]!)}]`, `0 <= ${print(args[1]!)} < len(${print(args[0]!)})`),
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
		emit: (args) => checked(print(args[0]!), `-719162 <= ${print(args[0]!)} <= 2932896`),
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
		emit: (args) =>
			checked(
				`${print(args[0]!)} + ${print(args[1]!)}`,
				`-719162 <= ${print(args[0]!)} + ${print(args[1]!)} <= 2932896`,
			),
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
			if (expr.op === "!" && expr.operand.kind === "binary" && expr.operand.op === "is") {
				return `(${print(expr.operand.left)} is not ${print(expr.operand.right)})`;
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

/**
 * A docstring whose backslashes survive: a plain Python string reads `\\u` as an escape.
 *
 * A doc that spans lines keeps all of them, indented to the body with the closing quotes on their
 * own line, the shape PEP 257 describes. Keeping only the first line used to cut a sentence in
 * half, since the source wraps its prose.
 */
function docstring(text: string, indent: string): string {
	const lines = text.split("\n").map((line) => line.replaceAll("\\", "\\\\").replaceAll(TRIPLE_QUOTE, "'''"));
	if (lines.length === 1) return `${TRIPLE_QUOTE}${lines[0]}${TRIPLE_QUOTE}`;
	const body = lines.map((line) => (line === "" ? "" : `${indent}${line}`)).join("\n").trimStart();
	return `${TRIPLE_QUOTE}${body}\n${indent}${TRIPLE_QUOTE}`;
}

const TRIPLE_QUOTE = '"'.repeat(3);

export function printFunction(fn: TFunc): string {
	const params = fn.params.map((param) => `${param.name}: ${pyType(param.type)}`).join(", ");
	const doc = fn.doc === undefined ? "" : `    ${docstring(fn.doc, "    ")}\n`;
	return `def ${fn.name}(${params}) -> ${pyType(fn.ret)}:\n${doc}${printBody(fn.body, 1)}`;
}

export function printRecord(record: TRecord): string {
	const fields = record.fields.map((field) => `    ${snake(field.name)}: ${pyType(field.type)}`).join("\n");
	const doc = record.doc === undefined ? "" : `    ${docstring(record.doc, "    ")}\n`;
	return `@dataclass(frozen=True)\nclass ${record.name}:\n${doc}${fields}`;
}

/** A module path as a Python identifier fragment: `lib/cnpj` becomes `LIB_CNPJ`. */
function identifierPrefix(sourcePath: string): string {
	return sourcePath.split(/[^a-zA-Z0-9]+/u).filter((part) => part !== "").join("_").toUpperCase();
}

/**
 * Compiles each pattern once, at module level, instead of on every call.
 *
 * `re.fullmatch(pattern, value)` and `re.sub(pattern, …)` look the pattern up in `re`'s cache by
 * its source string on every call, and these patterns are long. Measured, that lookup is about
 * 50 ms per 200 000 calls for each of the two, against a compiled pattern's method call — roughly
 * 15% of a validator. The pattern is known when the code is generated, so it is compiled then,
 * which is also what a Python author would write.
 *
 * The names carry the module so a reader can tell where a pattern came from.
 */
function hoistPatterns(module: TModule, body: string): { body: string; declarations: string[] } {
	const names = new Map<string, string>();
	const prefix = identifierPrefix(module.sourcePath);
	const hoisted = body.replaceAll(
		/\bre\.(fullmatch|sub)\((("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*'))(, )/gu,
		(_match, method: string, literal: string, _double: string, _single: string, tail: string) => {
			const existing = names.get(literal);
			const name = existing ?? `_${prefix}_PATTERN_${names.size + 1}`;
			if (existing === undefined) names.set(literal, name);
			// `re.sub(pattern, repl, value)` becomes `pattern.sub(repl, value)`: the pattern stops
			// being an argument, and the separator that followed it goes with it.
			void tail;
			return `${name}.${method}(`;
		},
	);
	const declarations = [...names].map(([literal, name]) => `${name} = re.compile(${literal})`);
	return { body: hoisted, declarations };
}

/**
 * Marks every function its source module never exported as Python's own notion of private: a
 * leading underscore, on the declaration and on every call site that names it. Every such
 * function is called only from within its own module (`docs/semantics.md`'s effects section
 * surveys the whole project), so a module-local rename is enough — nothing outside ever needs the
 * unprefixed name resolved.
 */
function applyPrivacy(module: TModule): TModule {
	const renamed = new Map<string, string>();
	for (const fn of module.functions) {
		if (!fn.moduleExported) renamed.set(fn.name, `_${fn.name}`);
	}
	if (renamed.size === 0) return module;
	const rename = (expr: TExpr): TExpr => {
		if (expr.kind === "name" && renamed.has(expr.name)) return { ...expr, name: renamed.get(expr.name)! };
		// A lowering-table candidate (`task.race`'s, among others) can pre-render a fragment of
		// text at lowering time, baking in whatever name the callee had then — `mapExprs` cannot
		// see inside it the way it sees a "call" node's own callee, so the same rename repeats here
		// as a word-boundary substitution, the technique `hoistPatterns` already uses in this file.
		if (expr.kind === "raw") {
			let text = expr.text;
			for (const [from, to] of renamed) text = text.replaceAll(new RegExp(`\\b${from}\\b`, "gu"), to);
			return text === expr.text ? expr : { ...expr, text };
		}
		return expr;
	};
	return {
		...module,
		functions: module.functions.map((fn) => ({
			...fn,
			name: renamed.get(fn.name) ?? fn.name,
			body: mapExprs(fn.body, rename),
		})),
	};
}

export function printModule(rawModule: TModule): string {
	const module = applyPrivacy(rawModule);
	const typingNames = new Set<string>();
	// Module level constants are upper cased, the way Python names a constant, so every reference
	// to one has to be upper cased too. Driven by the module's own constants rather than by a
	// pattern that guesses at their names, which silently missed any name shaped differently.
	const text = module.constants.reduce(
		(body, constant) =>
			body.replaceAll(new RegExp(`\\b${constant.name}\\b`, "gu"), constant.name.toUpperCase()),
		module.functions.map(printFunction).join("\n\n\n"),
	);
	const patterns = hoistPatterns(module, text);
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
		const used = ["race_first_some"].filter((helper) => new RegExp(`\\b${helper}\\(`).test(text));
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
	// `__all__` names the module's public surface explicitly, on top of the leading underscore
	// `applyPrivacy` already gave every unexported function — the two devices Python convention
	// pairs for exactly this, so `from module import *` matches what the source module exported.
	const publicFunctions = module.functions.filter((fn) => fn.moduleExported).map((fn) => fn.name);
	if (publicFunctions.length > 0) {
		parts.push(`__all__ = [${publicFunctions.map((name) => JSON.stringify(name)).join(", ")}]`, "");
	}
	if (records !== "") parts.push(records, "");
	for (const constant of module.constants) {
		parts.push(`${constant.name.toUpperCase()}: ${pyType(constant.type)} = ${print(constant.value)}`, "");
	}
	for (const declaration of patterns.declarations) parts.push(declaration, "");
	parts.push(patterns.body);
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
			"        import random",
			"",
			"        # Not cryptographically secure, deliberately: the utilities that draw are",
			"        # generating example documents, and that is what the published package",
			"        # documents doing. A caller who needs unpredictability passes its own",
			"        # capability, the way the conformance harness passes a seeded one.",
			"        return random.getrandbits(32)",
			"",
			"",
			"# The platform default, built once at import time rather than per call — every public",
			"# wrapper (docs/decisions/0011-public-entry-points-vs-capabilities.md) shares this one",
			"# instance, the same way a caller who builds their own environment would share it.",
			"DEFAULT_CAPABILITIES = Capabilities()",
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
			`    ${docstring(error.doc ?? error.name, "    ")}`,
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
	defaultCapabilities: {
		ref: { kind: "name", name: "DEFAULT_CAPABILITIES" },
		imports: [{ from: "SUPPORT", names: ["DEFAULT_CAPABILITIES"] }],
		seamName: (publicName) => `${publicName}_with`,
	},
	// Aggressive: CPython pays a full frame per call (no JIT to elide it), so a chain like
	// `random_digit` → `random_below` → `next_u32`, called once per digit, is the largest measured
	// cost in `generateCpf`/`generateCnpj` (`engine/docs/progress.md` §8). `randomBelow`'s own body
	// (a bounded rejection-sampling loop) is the largest shape this needs to reach, at 6 statements.
	inlineBudget: { maxStatements: 12, rounds: 3 },
};
