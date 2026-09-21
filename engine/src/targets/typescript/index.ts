/**
 * The TypeScript backend.
 *
 * ES2020 on Node 20, ESM only, one module per source module with named exports, no module level
 * effects and no external dependencies. Integers are `number` while their proven range fits
 * ±(2^53−1) and `bigint` otherwise; a `Decimal<S>` is its unscaled integer, which is exact and
 * native everywhere.
 */

import type { SemType } from "../../types.ts";
import { SAFE_INT_HI, SAFE_INT_LO, typeToString } from "../../types.ts";
import type { Value } from "../../values.ts";
import type { Candidate } from "../../backend/select.ts";
import { LoweringTable, argIsAscii } from "../../backend/select.ts";
import type { TargetSpec } from "../../backend/lower.ts";
import { asciiString, mapExprs } from "../../backend/tast.ts";
import type { TExpr, TFunc, TModule, TRecord, TStmt } from "../../backend/tast.ts";

export const TYPESCRIPT_CONFIG = {
	baseline: "ES2020 on Node 20",
	fileExtension: ".ts",
	/** Node runs the generated sources directly, so relative imports carry their extension. */
	importExtension: ".ts",
	dependencies: [] as string[],
	formatter: "prettier",
	linters: ["tsc --strict --noEmit"],
};

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export function needsBigInt(type: SemType): boolean {
	return type.kind === "Int" && (type.lo < SAFE_INT_LO || type.hi > SAFE_INT_HI);
}

export function tsType(type: SemType): string {
	switch (type.kind) {
		case "Bool":
			return "boolean";
		case "Int":
			return needsBigInt(type) ? "bigint" : "number";
		case "Float":
			return "number";
		case "Decimal":
			return "number";
		case "String":
			return "string";
		case "List":
			return `readonly ${wrap(tsType(type.elem))}[]`;
		case "Option":
			return `${tsType(type.inner)} | undefined`;
		case "Record":
			return type.name;
		case "Enum":
			return type.members.map((member) => JSON.stringify(member)).join(" | ");
		case "Union":
			return type.name;
		case "CivilDate":
		case "Instant":
		case "Duration":
			return "number";
		case "Lambda":
			return `(${type.params.map((param, index) => `arg${index}: ${tsType(param)}`).join(", ")}) => ${tsType(type.ret)}`;
		case "Void":
			return "void";
		case "Never":
			return "never";
		default: {
			const exhaustive: never = type;
			return exhaustive;
		}
	}
}

/** The type of a local that is still being built: a list is mutable until it escapes. */
export function mutableType(type: SemType): string {
	return type.kind === "List" ? `${wrap(tsType(type.elem))}[]` : tsType(type);
}

function wrap(rendered: string): string {
	return rendered.includes("|") || rendered.includes("=>") ? `(${rendered})` : rendered;
}

/* ------------------------------------------------------------------ *
 * Capability table
 * ------------------------------------------------------------------ */


/** The body of a printed class, so a lowering can negate it. */
function classBody(printed: string): string {
	return printed.startsWith("[") && printed.endsWith("]") ? printed.slice(1, -1) : printed;
}

const raw = (text: string): TExpr => ({ kind: "raw", text });

function binary(op: string): Candidate["emit"] {
	return (args) => ({ kind: "binary", op, left: args[0]!, right: args[1]! });
}

function method(name: string, extra = 0): Candidate["emit"] {
	return (args) => ({ kind: "method", target: args[0]!, name, args: args.slice(1, 1 + extra) });
}

const cheap = { alloc: "none", time: "constant" } as const;
const linear = { alloc: "none", time: "linear" } as const;
const allocating = { alloc: "one", time: "linear" } as const;
/** A pass that materializes the scalars of a string: correct everywhere, and the slowest option. */
const scalarPass = { alloc: "many", time: "linear" } as const;

export const TYPESCRIPT_CANDIDATES: readonly Candidate[] = [
	// Integers and floats
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
		cost: cheap,
		because: "`/` on numbers is not integer division",
		emit: (args, types) =>
			needsBigInt(types[0] ?? { kind: "Int", lo: 0n, hi: 0n })
				? { kind: "binary", op: "/", left: args[0]!, right: args[1]! }
				: { kind: "call", callee: raw("Math.trunc"), args: [{ kind: "binary", op: "/", left: args[0]!, right: args[1]! }] },
	},
	{ op: "int.mod", impl: "native", cost: cheap, emit: binary("%") },
	{ op: "int.neg", impl: "native", cost: cheap, emit: (args) => ({ kind: "unary", op: "-", operand: args[0]! }) },
	{ op: "float.neg", impl: "native", cost: cheap, emit: (args) => ({ kind: "unary", op: "-", operand: args[0]! }) },
	{ op: "int.abs", impl: "native", cost: cheap, emit: (args) => ({ kind: "call", callee: raw("Math.abs"), args: [args[0]!] }) },
	{ op: "int.min", impl: "native", cost: cheap, emit: (args) => ({ kind: "call", callee: raw("Math.min"), args }) },
	{ op: "int.max", impl: "native", cost: cheap, emit: (args) => ({ kind: "call", callee: raw("Math.max"), args }) },
	...["lt:<", "le:<=", "gt:>", "ge:>="].flatMap((entry) => {
		const [op, symbol] = entry.split(":") as [string, string];
		return [
			{ op: `int.${op}`, impl: "native" as const, cost: cheap, emit: binary(symbol) },
			{ op: `float.${op}`, impl: "native" as const, cost: cheap, emit: binary(symbol) },
		];
	}),
	{ op: "float.fromInt", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{ op: "core.eq", impl: "native", cost: cheap, emit: binary("===") },

	// Options
	{ op: "opt.isNone", impl: "native", cost: cheap, emit: (args) => ({ kind: "binary", op: "===", left: args[0]!, right: raw("undefined") }) },
	{ op: "opt.unwrap", impl: "native", cost: cheap, emit: (args) => ({ kind: "unary", op: "post!", operand: args[0]! }) },
	{ op: "opt.some", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{ op: "opt.orElse", impl: "native", cost: cheap, emit: binary("??") },

	// Strings
	{
		op: "str.len",
		impl: "native",
		requires: argIsAscii(0),
		because: "`String#length` counts UTF-16 code units, which only equals the scalar count for ASCII",
		cost: cheap,
		emit: (args) => ({ kind: "member", target: args[0]!, name: "length" }),
	},
	{
		op: "str.len",
		impl: "portable",
		cost: allocating,
		emit: (args) => ({ kind: "member", target: { kind: "raw", text: `[...${print(args[0]!)}]` }, name: "length" }),
	},
	{ op: "str.concat", impl: "native", cost: cheap, emit: binary("+") },
	{
		op: "str.codeAt",
		impl: "native",
		requires: argIsAscii(0),
		because: "`charCodeAt` returns a UTF-16 code unit",
		cost: cheap,
		emit: method("charCodeAt", 1),
	},
	{
		op: "str.charAt",
		impl: "native",
		requires: argIsAscii(0),
		because: "indexing a string yields one UTF-16 code unit",
		cost: cheap,
		emit: (args) => ({ kind: "index", target: args[0]!, index: args[1]! }),
	},
	{
		op: "str.codeAtOpt",
		impl: "native",
		requires: argIsAscii(0),
		because: "charCodeAt answers NaN past the end, so the bound is checked explicitly",
		cost: cheap,
		emit: (args) =>
			raw(
				`(${print(args[1]!)} < ${print(args[0]!)}.length ? ${print(args[0]!)}.charCodeAt(${print(args[1]!)}) : undefined)`,
			),
	},
	{
		op: "str.charAtOpt",
		impl: "native",
		requires: argIsAscii(0),
		because: "indexing a string yields one UTF-16 code unit, and undefined past the end",
		cost: cheap,
		emit: (args) => raw(`${print(args[0]!)}[${print(args[1]!)}]`),
	},
	{
		op: "str.slice",
		impl: "native",
		requires: argIsAscii(0),
		because: "`slice` cuts at UTF-16 boundaries",
		cost: allocating,
		emit: method("slice", 2),
	},
	{ op: "str.indexOf", impl: "native", requires: argIsAscii(0), because: "`indexOf` returns a UTF-16 index", cost: linear, emit: method("indexOf", 1) },
	{ op: "str.contains", impl: "native", cost: linear, emit: method("includes", 1) },
	{ op: "str.startsWith", impl: "native", cost: linear, emit: method("startsWith", 1) },
	{ op: "str.endsWith", impl: "native", cost: linear, emit: method("endsWith", 1) },
	{ op: "str.repeat", impl: "native", cost: allocating, emit: method("repeat", 1) },
	{ op: "str.padStart", impl: "native", requires: argIsAscii(0), because: "`padStart` counts UTF-16 code units", cost: allocating, emit: method("padStart", 2) },
	{
		op: "str.trim",
		impl: "native",
		cost: allocating,
		because: "`String#trim` removes exactly the 25 code points the spec names",
		emit: method("trim"),
	},
	{
		op: "str.asciiUpper",
		impl: "native",
		requires: argIsAscii(0),
		because: "`toUpperCase` is only ASCII-equivalent on ASCII input (ß becomes SS otherwise)",
		cost: allocating,
		emit: method("toUpperCase"),
	},
	{
		op: "str.asciiLower",
		impl: "native",
		requires: argIsAscii(0),
		because: "`toLowerCase` is only ASCII-equivalent on ASCII input",
		cost: allocating,
		emit: method("toLowerCase"),
	},
	{
		op: "str.asciiUpper",
		impl: "native",
		because: "a single regex pass maps a-z and leaves every other scalar alone, which is the Core's rule for any input",
		cost: allocating,
		emit: (args) => raw(`${print(args[0]!)}.replace(/[a-z]/gu, (scalar) => scalar.toUpperCase())`),
	},
	{
		op: "str.asciiLower",
		impl: "native",
		because: "a single regex pass maps A-Z and leaves every other scalar alone",
		cost: allocating,
		emit: (args) => raw(`${print(args[0]!)}.replace(/[A-Z]/gu, (scalar) => scalar.toLowerCase())`),
	},
	{
		op: "str.compare",
		impl: "native",
		requires: (args) => argIsAscii(0)(args) && argIsAscii(1)(args),
		because: "`<` compares UTF-16 code units, so astral scalars would sort before U+E000",
		cost: cheap,
		emit: (args) => raw(`(${print(args[0]!)} < ${print(args[1]!)} ? -1 : ${print(args[0]!)} > ${print(args[1]!)} ? 1 : 0)`),
	},
	{
		op: "str.compare",
		impl: "portable",
		cost: scalarPass,
		sourceFn: "std/strings::compareScalars",
		emit: (args, _types, ctx) => ({
			kind: "call",
			callee: { kind: "name", name: ctx.nameOf("std/strings::compareScalars") },
			args: [args[0]!, args[1]!],
		}),
	},
	{
		op: "str.codePoints",
		impl: "native",
		cost: allocating,
		emit: (args) => raw(`Array.from(${print(args[0]!)}, (scalar) => scalar.codePointAt(0)!)`),
	},
	{
		op: "str.fromCodePoints",
		impl: "native",
		cost: allocating,
		emit: (args) => raw(`${print(args[0]!)}.map((point) => String.fromCodePoint(point)).join("")`),
	},
	{
		op: "str.asAscii",
		impl: "native",
		cost: linear,
		emit: (args) => raw(`(Array.from(${print(args[0]!)}).every((scalar) => scalar.codePointAt(0)! < 0x80) ? ${print(args[0]!)} : undefined)`),
	},
	{
		op: "str.asDigits",
		impl: "native",
		cost: linear,
		emit: (args) => raw(`(/^[0-9]+$/.test(${print(args[0]!)}) ? ${print(args[0]!)} : undefined)`),
	},
	{ op: "str.split", impl: "native", requires: argIsAscii(1), because: "the separator must be one ASCII scalar", cost: allocating, emit: method("split", 1) },
	{ op: "str.join", impl: "native", cost: allocating, emit: method("join", 1) },
	{ op: "str.fromInt", impl: "native", cost: allocating, emit: (args) => ({ kind: "method", target: args[0]!, name: "toString", args: [] }) },
	{
		op: "str.parseInt",
		impl: "native",
		cost: linear,
		emit: (args) => raw(`(/^[0-9]{1,18}$/.test(${print(args[0]!)}) ? Number(${print(args[0]!)}) : undefined)`),
	},

	// Sequences
	{
		op: "seq.at",
		impl: "native",
		cost: cheap,
		emit: (args) => raw(`${print(args[0]!)}[${print(args[1]!)}]`),
	},
	{
		op: "str.asciiUpper",
		impl: "portable",
		// Building a scalar list costs far more than the host's own pass, which is why the cost
		// class has to say so: selection ranks by cost before it ranks by implementation kind.
		cost: scalarPass,
		sourceFn: "std/strings::asciiUpperAll",
		emit: (args, _types, ctx) => ({ kind: "call", callee: { kind: "name", name: ctx.nameOf("std/strings::asciiUpperAll") }, args: [args[0]!] }),
	},
	{
		op: "str.asciiLower",
		impl: "portable",
		cost: scalarPass,
		sourceFn: "std/strings::asciiLowerAll",
		emit: (args, _types, ctx) => ({ kind: "call", callee: { kind: "name", name: ctx.nameOf("std/strings::asciiLowerAll") }, args: [args[0]!] }),
	},
	{ op: "seq.len", impl: "native", cost: cheap, emit: (args) => ({ kind: "member", target: args[0]!, name: "length" }) },
	{ op: "seq.get", impl: "native", cost: cheap, emit: (args) => ({ kind: "index", target: args[0]!, index: args[1]! }) },
	{ op: "seq.push", impl: "native", cost: cheap, emit: (args) => ({ kind: "method", target: args[0]!, name: "push", args: [args[1]!] }) },
	{ op: "seq.map", impl: "native", cost: allocating, emit: method("map", 1) },
	{ op: "seq.filter", impl: "native", cost: allocating, emit: method("filter", 1) },
	{ op: "seq.any", impl: "native", cost: linear, emit: method("some", 1) },
	{ op: "seq.all", impl: "native", cost: linear, emit: method("every", 1) },
	{ op: "seq.find", impl: "native", cost: linear, emit: method("find", 1) },
	{ op: "seq.fold", impl: "native", cost: linear, emit: (args) => ({ kind: "method", target: args[0]!, name: "reduce", args: [args[2]!, args[1]!] }) },
	{ op: "seq.sum", impl: "native", cost: linear, emit: (args) => raw(`${print(args[0]!)}.reduce((total, item) => total + item, 0)`) },
	{ op: "seq.indexOf", impl: "native", cost: linear, emit: method("indexOf", 1) },
	{ op: "seq.contains", impl: "native", cost: linear, emit: method("includes", 1) },
	{ op: "seq.concat", impl: "native", cost: allocating, emit: method("concat", 1) },
	{ op: "seq.slice", impl: "native", cost: allocating, emit: method("slice", 2) },
	{ op: "seq.reverse", impl: "native", cost: allocating, emit: (args) => raw(`[...${print(args[0]!)}].reverse()`) },
	{
		op: "seq.sortStable",
		impl: "native",
		because: "Array#sort has been required to be stable since ES2019",
		cost: { alloc: "one", time: "nlogn" },
		emit: (args) => raw(`[...${print(args[0]!)}].sort(${print(args[1]!)})`),
	},
	{
		op: "seq.sortStableBy",
		impl: "native",
		cost: { alloc: "one", time: "nlogn" },
		emit: (args, types) => {
			const key = print(args[1]!);
			const keyType = types[1];
			const comparison =
				keyType !== undefined && keyType.kind === "Lambda" && keyType.ret.kind === "String"
					? "left < right ? -1 : left > right ? 1 : 0"
					: "left < right ? -1 : left > right ? 1 : 0";
			return raw(
				`[...${print(args[0]!)}].sort((a, b) => { const left = (${key})(a); const right = (${key})(b); return ${comparison}; })`,
			);
		},
	},

	// Decimals: the unscaled integer, which is exact and native.
	{ op: "dec.fromScaled", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{ op: "dec.fromInt", impl: "native", cost: cheap, emit: (args, types) => raw(`${print(args[0]!)} * ${10 ** scaleOf(types[1])}`) },
	{ op: "dec.add", impl: "native", cost: cheap, emit: binary("+") },
	{ op: "dec.sub", impl: "native", cost: cheap, emit: binary("-") },
	{ op: "dec.mul", impl: "native", cost: cheap, emit: binary("*") },
	{ op: "dec.compare", impl: "native", cost: cheap, emit: (args) => raw(`(${print(args[0]!)} < ${print(args[1]!)} ? -1 : ${print(args[0]!)} > ${print(args[1]!)} ? 1 : 0)`) },
	{ op: "dec.isNegative", impl: "native", cost: cheap, emit: (args) => raw(`${print(args[0]!)} < 0`) },
	{ op: "dec.abs", impl: "native", cost: cheap, emit: (args) => ({ kind: "call", callee: raw("Math.abs"), args: [args[0]!] }) },
	{ op: "dec.unscaled", impl: "native", cost: cheap, emit: (args) => args[0]! },

	// Dates: a civil date is days since the epoch in every target.
	{
		op: "date.clampEpochDays",
		impl: "native",
		cost: cheap,
		emit: (args) => raw(`Math.min(Math.max(${print(args[0]!)}, -719162), 2932896)`),
	},
	{ op: "date.toEpochDays", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{
		op: "date.fromEpochDays",
		impl: "native",
		cost: cheap,
		emit: (args) => raw(`(${print(args[0]!)} >= -719162 && ${print(args[0]!)} <= 2932896 ? ${print(args[0]!)} : undefined)`),
	},
	{
		// `ymdToDays` (the fallback below) computes the day forward and then verifies the round trip
		// by decomposing it back into year/month/day through three more floor-division-heavy Hinnant
		// functions — measured at 78% of `getHolidays`' call (`engine/docs/progress.md` §8). The round
		// trip only exists to answer one question, "is `day` within the month it names", which is
		// exactly what a days-in-month table already answers directly: once the month and year are in
		// range, `day` names a real date iff it does not exceed that month's length (28-31, with
		// February's leap adjustment). That table check plus the single forward computation is
		// mathematically the same predicate the round trip computes, just without decomposing the
		// result back out again.
		op: "date.fromYmd",
		impl: "portable",
		cost: cheap,
		sourceFn: "std/date::daysFromCivil",
		emit: (args, _types, ctx) => {
			const dayLimit = (year: string, month: string): string =>
				`${month} === 2 ? ((${year} % 4 === 0 && ${year} % 100 !== 0) || ${year} % 400 === 0 ? 29 : 28) : (${month} === 4 || ${month} === 6 || ${month} === 9 || ${month} === 11 ? 30 : 31)`;
			const forward = (year: string, month: string, day: string): TExpr =>
				({
					kind: "call",
					callee: { kind: "name", name: ctx.nameOf("std/date::daysFromCivil") },
					args: [raw(year), raw(month), raw(day)],
				}) as TExpr;
			// A cheap-to-duplicate argument (a name or a literal, never a call or a computed member) is
			// printed directly, several times, rather than paying for a closure that only exists to
			// bind it once — the same reasoning `date.fromEpochDays` above already relies on. Anything
			// else is bound once by an IIFE, so an effectful or otherwise non-trivial expression is
			// never evaluated twice.
			if (args.every((arg) => arg.kind === "name" || arg.kind === "lit")) {
				const year = print(args[0]!);
				const month = print(args[1]!);
				const day = print(args[2]!);
				return raw(
					`(${year} < 1 || ${year} > 9999 || ${month} < 1 || ${month} > 12 || ${day} < 1 || ${day} > (${dayLimit(year, month)}) ? undefined : ${print(forward(year, month, day))})`,
				);
			}
			return raw(
				`((y, m, d) => {\n` +
					`\t\tif (y < 1 || y > 9999 || m < 1 || m > 12 || d < 1) return undefined;\n` +
					`\t\tconst limit = ${dayLimit("y", "m")};\n` +
					`\t\treturn d > limit ? undefined : ${print(forward("y", "m", "d"))};\n` +
					`\t})(${print(args[0]!)}, ${print(args[1]!)}, ${print(args[2]!)})`,
			);
		},
	},
	{
		op: "date.year",
		impl: "portable",
		cost: cheap,
		sourceFn: "std/date::yearFromDays",
		emit: (args, _types, ctx) => ({ kind: "call", callee: { kind: "name", name: ctx.nameOf("std/date::yearFromDays") }, args: [args[0]!] }),
	},
	{
		op: "date.month",
		impl: "portable",
		cost: cheap,
		sourceFn: "std/date::monthFromDays",
		emit: (args, _types, ctx) => ({ kind: "call", callee: { kind: "name", name: ctx.nameOf("std/date::monthFromDays") }, args: [args[0]!] }),
	},
	{
		op: "date.day",
		impl: "portable",
		cost: cheap,
		sourceFn: "std/date::dayFromDays",
		emit: (args, _types, ctx) => ({ kind: "call", callee: { kind: "name", name: ctx.nameOf("std/date::dayFromDays") }, args: [args[0]!] }),
	},
	{
		op: "date.addDays",
		impl: "native",
		cost: cheap,
		emit: (args) =>
			raw(
				`(${print(args[0]!)} + ${print(args[1]!)} >= -719162 && ${print(args[0]!)} + ${print(args[1]!)} <= 2932896 ? ${print(args[0]!)} + ${print(args[1]!)} : undefined)`,
			),
	},
	{ op: "date.diffDays", impl: "native", cost: cheap, emit: binary("-") },
	{ op: "date.compare", impl: "native", cost: cheap, emit: (args) => raw(`(${print(args[0]!)} < ${print(args[1]!)} ? -1 : ${print(args[0]!)} > ${print(args[1]!)} ? 1 : 0)`) },
	{ op: "date.dayOfWeek", impl: "native", cost: cheap, emit: (args) => raw(`((((${print(args[0]!)} + 3) % 7) + 7) % 7) + 1`) },
	{
		op: "date.isLeapYear",
		impl: "native",
		cost: cheap,
		emit: (args) => raw(`((${print(args[0]!)} % 4 === 0 && ${print(args[0]!)} % 100 !== 0) || ${print(args[0]!)} % 400 === 0)`),
	},

	// Regex: the normalized pattern, printed in the dialect every target reads the same way.
	{
		op: "re.retain",
		impl: "native",
		because: "a single pass with the negated class, which every engine reads the same way",
		cost: allocating,
		emit: (args, _types, ctx) => {
			const pattern = ctx.regex === undefined ? "" : printRegexNode(ctx.regex.node, "javascript");
			return raw(`${print(args[0]!)}.replace(/[^${classBody(pattern)}]/gu, "")`);
		},
	},
	{
		op: "re.test",
		impl: "native",
		cost: linear,
		because: "the normalized pattern is inside the compatibility subset",
		emit: (args, _types, ctx) => raw(`/^${printedPattern(ctx)}$/u.test(${print(args[0]!)})`),
	},

	// Capabilities
	{
		op: "http.request",
		impl: "native",
		cost: { alloc: "many", time: "linear" },
		emit: (args, _types, ctx) => ({ kind: "method", target: ctx.env(), name: "request", args: [args[0]!], await: true }),
	},
	{ op: "clock.now", impl: "native", cost: cheap, emit: (_args, _types, ctx) => ({ kind: "method", target: ctx.env(), name: "now", args: [] }) },
	{
		op: "clock.sleep",
		impl: "native",
		cost: cheap,
		emit: (args, _types, ctx) => ({ kind: "method", target: ctx.env(), name: "sleep", args: [args[0]!], await: true }),
	},
	{ op: "clock.millis", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{ op: "clock.durationMillis", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{ op: "clock.elapsed", impl: "native", cost: cheap, emit: (args) => raw(`Math.max(0, ${print(args[1]!)} - ${print(args[0]!)})`) },
	{ op: "random.nextU32", impl: "native", cost: cheap, emit: (_args, _types, ctx) => ({ kind: "method", target: ctx.env(), name: "nextU32", args: [] }) },
	{
		op: "task.race",
		impl: "native",
		because: "Promise.any resolves with the first task to answer, which is the semantics of race",
		cost: { alloc: "many", time: "linear" },
		emit: (args) => raw(`await raceFirstSome(${print(args[0]!)})`),
	},
];

function scaleOf(type: SemType | undefined): number {
	return type !== undefined && type.kind === "Int" ? Number(type.lo) : 0;
}

function printedPattern(ctx: { regex?: { node: unknown } }): string {
	const regex = ctx.regex as { node: Parameters<typeof printRegexNode>[0] } | undefined;
	return regex === undefined ? "" : printRegexNode(regex.node, "javascript");
}

import { printRegex as printRegexNode } from "../../regex.ts";

export const TYPESCRIPT_SPEC: TargetSpec = {
	name: "typescript",
	table: new LoweringTable(TYPESCRIPT_CANDIDATES),
	naming: {
		func: (name) => camel(name),
		value: (name) => camel(name),
		field: (name) => name,
		type: (name) => name,
		module: (path) => `${path}.ts`,
	},
	loopCombinators: new Set<string>(),
	statementTernary: false,
	errorsAsValues: false,
	asyncColouring: true,
	envType: { kind: "Record", name: "Capabilities" },
};

function camel(name: string): string {
	return name.replace(/[-_](.)/g, (_match, char: string) => char.toUpperCase());
}

/* ------------------------------------------------------------------ *
 * Printer
 * ------------------------------------------------------------------ */

export function print(expr: TExpr): string {
	switch (expr.kind) {
		case "lit":
			return literal(expr.value, expr.type);
		case "name":
			return expr.name;
		case "raw":
			return expr.text;
		case "call":
			return `${expr.await === true ? "await " : ""}${print(expr.callee)}(${expr.args.map(print).join(", ")})`;
		case "method":
			return `${expr.await === true ? "await " : ""}${print(expr.target)}.${expr.name}(${expr.args.map(print).join(", ")})`;
		case "member":
			return `${print(expr.target)}.${expr.name}`;
		case "index":
			return `${print(expr.target)}[${print(expr.index)}]`;
		case "binary":
			return `(${print(expr.left)} ${expr.op} ${print(expr.right)})`;
		case "unary": {
			if (expr.op === "post!") return `${print(expr.operand)}!`;
			// `!(a === b)` reads better as `a !== b`, and the formatter cannot do that for us.
			if (expr.op === "!" && expr.operand.kind === "binary" && expr.operand.op === "===") {
				return `(${print(expr.operand.left)} !== ${print(expr.operand.right)})`;
			}
			return `${expr.op}${print(expr.operand)}`;
		}
		case "ternary":
			return `(${print(expr.test)} ? ${print(expr.then)} : ${print(expr.otherwise)})`;
		case "list":
			return `[${expr.items.map(print).join(", ")}]`;
		case "record":
			return `{ ${expr.fields.map((field) => `${field.name}: ${print(field.value)}`).join(", ")} }`;
		case "lambda": {
			const params = expr.params.map((param) => `${param.name}: ${tsType(param.type)}`).join(", ");
			// A lambda that awaits is async, which is the same colouring rule the compiler applies
			// to a function that reaches Http.
			const asyncPrefix = containsAwait(expr.body) ? "async " : "";
			const ret = asyncPrefix === "" ? tsType(expr.ret) : `Promise<${tsType(expr.ret)}>`;
			if (expr.body.length === 1 && expr.body[0]!.kind === "return" && expr.body[0]!.value !== undefined) {
				return `${asyncPrefix}(${params}): ${ret} => ${print(expr.body[0]!.value!)}`;
			}
			return `${asyncPrefix}(${params}): ${ret} => {\n${printBody(expr.body, 1)}\n}`;
		}
		case "none":
			return "undefined";
		case "some":
			return print(expr.inner);
		case "zero":
			return "undefined";
		default: {
			const exhaustive: never = expr;
			return exhaustive;
		}
	}
}

/** Whether a statement list awaits anywhere outside a nested lambda. */
function containsAwait(body: readonly TStmt[]): boolean {
	let found = false;
	mapExprs(body, (expr) => {
		if ((expr.kind === "call" || expr.kind === "method") && expr.await === true) found = true;
		return expr;
	});
	return found;
}

function literal(value: Value, type: SemType): string {
	if (typeof value === "bigint") return needsBigInt(type) ? `${value}n` : value.toString();
	if (typeof value === "string") return asciiString(value);
	if (typeof value === "boolean") return String(value);
	if (typeof value === "number") return String(value);
	if (Array.isArray(value)) {
		const elem = type.kind === "List" ? type.elem : type;
		return `[${value.map((item) => literal(item, elem)).join(", ")}]`;
	}
	return "undefined";
}

function printBody(body: readonly TStmt[], depth: number): string {
	return body.map((statement) => printStmt(statement, depth)).join("\n");
}

function printStmt(statement: TStmt, depth: number): string {
	const pad = "\t".repeat(depth);
	switch (statement.kind) {
		case "let": {
			// A list still being built is mutable, so it is not printed `readonly`; it is frozen by
			// the semantics as soon as it escapes, which the Core guarantees.
			const rendered = statement.mutable ? mutableType(statement.type) : tsType(statement.type);
			return `${pad}${statement.mutable ? "let" : "const"} ${statement.name}: ${rendered} = ${print(statement.init)};`;
		}
		case "multiLet":
			return `${pad}const [${statement.names.join(", ")}] = ${print(statement.init)};`;
		case "assign":
			return `${pad}${print(statement.target)} = ${print(statement.value)};`;
		case "if": {
			const head = `${pad}if (${print(statement.test)}) {\n${printBody(statement.then, depth + 1)}\n${pad}}`;
			return statement.otherwise.length === 0
				? head
				: `${head} else {\n${printBody(statement.otherwise, depth + 1)}\n${pad}}`;
		}
		case "switch": {
			// The Core's `switch` never falls through — each case is a self-contained branch, which
			// is exactly why the source's own case-closing `break` carries no meaning and is dropped
			// on the way into Core (see `caseBody` in `core/check.ts`). JavaScript's `switch` is the
			// opposite: without an explicit `break`, one matching case runs every case below it too.
			// Printing the Core's cases as bare `case`/`default` blocks would silently reintroduce
			// the fallthrough the Core specifically does not have, so every case ends with a `break`
			// here, regardless of whether its own body already exits (a `break` after a `return` is
			// unreachable, not wrong, and is cheaper to emit unconditionally than to prove unneeded).
			const closedBody = (body: readonly TStmt[], indent: number): string =>
				body.length === 0
					? `${"\t".repeat(indent)}break;`
					: `${printBody(body, indent)}\n${"\t".repeat(indent)}break;`;
			const cases = statement.cases
				.map(
					(entry) =>
						`${pad}\t${entry.values.map((value) => `case ${JSON.stringify(value)}:`).join("\n" + pad + "\t")}\n${closedBody(entry.body, depth + 2)}`,
				)
				.join("\n");
			const fallback =
				statement.otherwise === undefined
					? ""
					: `\n${pad}\tdefault:\n${closedBody(statement.otherwise, depth + 2)}`;
			return `${pad}switch (${print(statement.subject)}) {\n${cases}${fallback}\n${pad}}`;
		}
		case "for": {
			const comparison = statement.step > 0n ? (statement.inclusive ? "<=" : "<") : statement.inclusive ? ">=" : ">";
			const update = statement.step === 1n ? `${statement.name}++` : statement.step === -1n ? `${statement.name}--` : `${statement.name} += ${statement.step}`;
			return `${pad}for (let ${statement.name} = ${print(statement.from)}; ${statement.name} ${comparison} ${print(statement.to)}; ${update}) {\n${printBody(statement.body, depth + 1)}\n${pad}}`;
		}
		case "forEach":
			return `${pad}for (const ${statement.name} of ${print(statement.iterable)}) {\n${printBody(statement.body, depth + 1)}\n${pad}}`;
		case "return":
			return statement.value === undefined ? `${pad}return;` : `${pad}return ${print(statement.value)};`;
		case "throw":
			return `${pad}throw new ${statement.errorClass}(${statement.args.map(print).join(", ")});`;
		case "break":
			return `${pad}break;`;
		case "continue":
			return `${pad}continue;`;
		case "expr":
			return `${pad}${print(statement.expr)};`;
		case "raw":
			return `${pad}${statement.text}`;
		default: {
			const exhaustive: never = statement;
			return exhaustive;
		}
	}
}

export function printFunction(fn: TFunc): string {
	const params = fn.params.map((param) => `${param.name}: ${tsType(param.type)}`).join(", ");
	const ret = fn.isAsync ? `Promise<${tsType(fn.ret)}>` : tsType(fn.ret);
	const doc = fn.doc === undefined ? "" : `/**\n${fn.doc.split("\n").map((line) => ` * ${line}`.trimEnd()).join("\n")}\n */\n`;
	// `moduleExported` is the source module's own `export`, not `exported` (utility-ness): a
	// helper never declared `export function` in its source stays a plain, unexported function
	// here too, even when it is a public utility's own internal implementation detail.
	const modifier = fn.moduleExported ? "export " : "";
	return `${doc}${modifier}${fn.isAsync ? "async " : ""}function ${fn.name}(${params}): ${ret} {\n${printBody(fn.body, 1)}\n}`;
}

export function printRecord(record: TRecord): string {
	const doc = record.doc === undefined ? "" : `/** ${record.doc} */\n`;
	const fields = record.fields
		.map((field) => `${field.doc === undefined ? "" : `\t/** ${field.doc} */\n`}\t readonly ${field.name}: ${tsType(field.type)};`)
		.join("\n")
		.replaceAll("\t readonly", "\treadonly");
	return `${doc}export type ${record.name} = {\n${fields}\n};`;
}

export function printModule(module: TModule): string {
	const parts: string[] = [module.header];
	void module.requires;
	for (const item of module.imports) {
		// `capabilities` lives at the output root, so a nested module walks back up to it.
		const from = item.from === "SUPPORT" ? importPath(module.sourcePath, "capabilities") : item.from;
		parts.push(
			`import ${item.typeOnly === true ? "type " : ""}{ ${item.names.join(", ")} } from ${JSON.stringify(from)};`,
		);
	}
	if (module.imports.length > 0) parts.push("");
	for (const record of module.records) parts.push(printRecord(record), "");
	for (const constant of module.constants) {
		parts.push(`const ${constant.name}: ${tsType(constant.type)} = ${print(constant.value)};`, "");
	}
	for (const fn of module.functions) parts.push(printFunction(fn), "");
	return `${parts.join("\n").trimEnd()}\n`;
}

export { typeToString };

/* ------------------------------------------------------------------ *
 * Backend
 * ------------------------------------------------------------------ */

import { dirname, relative as relativePath } from "node:path";
import type { Backend, DriverEntry, SupportNeeds } from "../../backend/generate.ts";
import type { CProgram } from "../../core/ir.ts";

function importPath(from: string, to: string): string {
	const rel = relativePath(dirname(from) === "." ? "" : dirname(from), to).split("\\").join("/");
	const prefixed = rel.startsWith(".") ? rel : `./${rel}`;
	return `${prefixed}${TYPESCRIPT_CONFIG.importExtension}`;
}

/**
 * The generated capability defaults.
 *
 * This is generated code, not a runtime package: it uses only the standard library, it is written
 * into the output next to the utilities, and a project that fakes its capabilities in tests simply
 * passes a different object.
 */
function supportModule(_program: CProgram, needs: SupportNeeds): { path: string; text: string } | undefined {
	if (!needs.env) return undefined;
	const race = `
/**
 * Takes the first task to answer, discarding the losers, and answers undefined when none does.
 *
 * Cancellation is best effort and semantically unobservable: a losing task may keep running, and
 * its answer is dropped. Only idempotent work belongs inside a race.
 */
export async function raceFirstSome<T>(tasks: readonly (() => Promise<T | undefined>)[]): Promise<T | undefined> {
	try {
		return await Promise.any(
			tasks.map(async (task) => {
				const value = await task();

				if (value === undefined) throw new Error("no answer");

				return value;
			}),
		);
	} catch {
		return undefined;
	}
}
`;
	const text = `// Code generated by the logic engine. DO NOT EDIT.
// engine: ${ENGINE_VERSION}
// source: capabilities

/** One request or response header. */
export type HttpHeader = {
	readonly name: string;
	readonly value: string;
};

/** An Http request handed to the environment. */
export type HttpRequest = {
	readonly method: string;
	readonly url: string;
	readonly headers: readonly HttpHeader[];
	readonly body: string;
	readonly timeoutMillis: number;
};

/** An Http response. A status of 400 or more is a value, not a failure. */
export type HttpResponse = {
	readonly status: number;
	readonly headers: readonly HttpHeader[];
	readonly body: string;
};

/** Everything the core needs from the outside world. */
export type Capabilities = {
	/** A transport error or a timeout answers \`undefined\`; a 4xx or 5xx status is a value. */
	request(request: HttpRequest): Promise<HttpResponse | undefined>;
	now(): number;
	sleep(milliseconds: number): Promise<void>;
	nextU32(): number;
};

/** The default environment, built from the platform's own standard library. */
export function defaultCapabilities(): Capabilities {
	return {
		async request(request: HttpRequest): Promise<HttpResponse | undefined> {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), request.timeoutMillis);

			try {
				const response = await fetch(request.url, {
					method: request.method,
					headers: request.headers.map((header) => [header.name, header.value]),
					body: request.body === "" ? undefined : request.body,
					signal: controller.signal,
				});

				const headers: { name: string; value: string }[] = [];
				response.headers.forEach((value, name) => headers.push({ name, value }));

				return { status: response.status, headers, body: await response.text() };
			} catch {
				return undefined;
			} finally {
				clearTimeout(timer);
			}
		},
		now(): number {
			return Date.now();
		},
		sleep(milliseconds: number): Promise<void> {
			return new Promise((resolve) => setTimeout(resolve, milliseconds));
		},
		// Not cryptographically secure, deliberately: the utilities that draw are generating
		// example documents, the published package documents using \`Math.random()\` for exactly
		// that, and \`crypto.getRandomValues\` measures 130x the cost per draw. A caller who needs
		// unpredictability passes its own capability.
		nextU32(): number {
			return Math.floor(Math.random() * 4294967296);
		},
	};
}

/**
 * The platform default, built once at module load rather than per call — every public wrapper
 * (\`docs/decisions/0011-public-entry-points-vs-capabilities.md\`) shares this one instance, the
 * same way a caller who builds their own environment would share it across calls.
 */
export const DEFAULT_CAPABILITIES: Capabilities = defaultCapabilities();
${race}`;
	return { path: `capabilities${TYPESCRIPT_CONFIG.fileExtension}`, text };
}

function errorsModule(program: CProgram): { path: string; text: string } | undefined {
	const declared = [...program.errors.values()];
	if (declared.length === 0) return undefined;
	const lines = [
		"// Code generated by the logic engine. DO NOT EDIT.",
		`// engine: ${ENGINE_VERSION}`,
		"// source: errors",
		"",
		"/** The root of every domain error the core raises. */",
		"export class DomainError extends Error {}",
		"",
	];
	for (const error of declared) {
		if (error.doc !== undefined) lines.push(`/** ${error.doc.split("\n")[0]} */`);
		lines.push(`export class ${error.name} extends ${error.base ?? "DomainError"} {}`, "");
	}
	return { path: `errors${TYPESCRIPT_CONFIG.fileExtension}`, text: lines.join("\n") };
}

import { ENGINE_VERSION } from "../../backend/generate.ts";


/**
 * The generated differential driver: one JSON line in, one JSON line out. The conformance harness
 * speaks this protocol to every target, so the interpreter and the three backends are compared
 * through exactly the same interface.
 */
function driverFiles(_program: CProgram, entries: readonly DriverEntry[]): { path: string; text: string }[] {
	const imports = new Map<string, string[]>();
	for (const entry of entries) {
		const from = `./${entry.modulePath}`;
		const names = imports.get(from) ?? [];
		names.push(entry.targetName);
		imports.set(from, names);
	}
	const lines = [
		"// Code generated by the logic engine. DO NOT EDIT.",
		"// source: _driver",
		"",
		'import { createInterface } from "node:readline";',
	];
	for (const [from, names] of imports) {
		lines.push(`import { ${[...new Set(names)].sort().join(", ")} } from ${JSON.stringify(from)};`);
	}
	const needsEnv = entries.some((entry) => entry.usesEnv);
	if (needsEnv) {
		lines.push(
			'import { readFileSync, existsSync } from "node:fs";',
			'import { defaultCapabilities, type Capabilities, type HttpRequest, type HttpResponse } from "./capabilities.ts";',
			"",
			"/**",
			" * The reference PCG32: same constants and default seed as `Interpreter`'s, so a draw",
			" * matches the reference bit for bit. A fresh instance is built for every request, the same",
			" * way the reference model starts a fresh interpreter — and so a fresh generator — per case.",
			" */",
			"class Pcg32 {",
			"\tprivate state = 0n;",
			"\tprivate readonly increment = 1442695040888963407n;",
			"",
			"\tconstructor(seed: bigint) {",
			"\t\tthis.next();",
			"\t\tthis.state = (this.state + seed) & 0xffffffffffffffffn;",
			"\t\tthis.next();",
			"\t}",
			"",
			"\tnext(): number {",
			"\t\tconst previous = this.state;",
			"\t\tthis.state = (previous * 6364136223846793005n + this.increment) & 0xffffffffffffffffn;",
			"\t\tconst xorshifted = (((previous >> 18n) ^ previous) >> 27n) & 0xffffffffn;",
			"\t\tconst rotation = previous >> 59n;",
			"\t\treturn Number(((xorshifted >> rotation) | (xorshifted << ((-rotation) & 31n))) & 0xffffffffn);",
			"\t}",
			"}",
			"",
			"// The interpreter's own default: its constructor falls back to this seed whenever",
			"// `Capabilities.seed` is left unset, which is how every conformance case runs it.",
			"const DEFAULT_SEED = 0x853c49e6748fea9bn;",
			"",
			"/**",
			" * The capability fake the differential harness drives.",
			" *",
			" * Responses come from `fixtures.json`, a URL that is not in it models a transport error,",
			" * and the scripted latency is what decides a race, the same way the reference model's",
			" * virtual clock decides it. `nextU32` gets a fresh PCG32 per call, matching the reference",
			" * model's fresh interpreter per case.",
			" */",
			"type Fixture = { status: number; body: string; latencyMillis?: number };",
			"",
			"function fakeCapabilities(fixtures: Record<string, Fixture>): Capabilities {",
			"\tconst random = new Pcg32(DEFAULT_SEED);",
			"",
			"\treturn {",
			"\t\tasync request(request: HttpRequest): Promise<HttpResponse | undefined> {",
			"\t\t\tconst fixture = fixtures[request.url];",
			"",
			"\t\t\tif (fixture === undefined) return undefined;",
			"",
			"\t\t\tawait new Promise((resolve) => setTimeout(resolve, fixture.latencyMillis ?? 0));",
			"",
			"\t\t\treturn { status: fixture.status, headers: [], body: fixture.body };",
			"\t\t},",
			"\t\tnow: () => 0,",
			"\t\tsleep: (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)),",
			"\t\tnextU32: () => random.next(),",
			"\t};",
			"}",
		);
	}
	lines.push(
		"",
		"type Handler = (args: readonly unknown[], env: unknown) => unknown;",
		"",
		"const handlers: Record<string, Handler> = {",
	);
	for (const entry of entries) {
		// `Parameters<typeof fn>` keeps the driver free of type imports and still type checks.
		const args = entry.params.map(
			(_param, index) => `args[${index}] as Parameters<typeof ${entry.targetName}>[${index}]`,
		);
		if (entry.usesEnv) args.push("env as Capabilities");
		lines.push(`\t${JSON.stringify(entry.coreName)}: (args, env) => ${entry.targetName}(${args.join(", ")}),`);
	}
	lines.push(
		"};",
		"",
		...(needsEnv
			? [
					'const fixturePath = new URL("fixtures.json", import.meta.url).pathname;',
					"const fixtures = existsSync(fixturePath)\n\t\t\t? (JSON.parse(readFileSync(fixturePath, \"utf8\")) as Record<string, Fixture>)\n\t\t\t: undefined;",
					"",
				]
			: []),
		"const reader = createInterface({ input: process.stdin });",
		"",
		"for await (const line of reader) {",
		'\tif (line.trim() === "") continue;',
		"\tconst request = JSON.parse(line) as { fn: string; args: unknown[] };",
		"",
		...(needsEnv
			? [
					"\t// A fresh environment per line: nextU32 starts from the same state the reference model's",
					"\t// fresh interpreter starts from for every case.",
					"\tconst environment = fixtures === undefined ? defaultCapabilities() : fakeCapabilities(fixtures);",
					"",
				]
			: []),
		"\ttry {",
		`\t\tconst value = await handlers[request.fn]!(request.args, ${needsEnv ? "environment" : "undefined"});`,
		'\t\tprocess.stdout.write(`${JSON.stringify({ ok: true, value: value === undefined ? null : value })}\\n`);',
		"\t} catch (error) {",
		'\t\tprocess.stdout.write(`${JSON.stringify({ ok: false, error: (error as Error).constructor.name })}\\n`);',
		"\t}",
		"}",
		"",
	);
	return [{ path: "_driver.ts", text: lines.join("\n") }];
}

export const TYPESCRIPT_BACKEND: Backend = {
	spec: TYPESCRIPT_SPEC,
	fileExtension: TYPESCRIPT_CONFIG.fileExtension,
	printModule,
	importPath,
	support: supportModule,
	errorsModule,
	renderType: tsType,
	comment: "//",
	driver: driverFiles,
	supportImport: (needs, usesEnv, builtins) => {
		const types = [...builtins];
		if (usesEnv && needs.env) types.push("Capabilities");
		const values = usesEnv && needs.race ? ["raceFirstSome"] : [];
		return [
			{ from: "SUPPORT", names: types.sort(), typeOnly: true },
			{ from: "SUPPORT", names: values },
		];
	},
	defaultCapabilities: {
		ref: { kind: "name", name: "DEFAULT_CAPABILITIES" },
		imports: [{ from: "SUPPORT", names: ["DEFAULT_CAPABILITIES"] }],
		seamName: (publicName) => `${publicName}With`,
	},
	// Measured, not assumed: V8 already inlines a small monomorphic call once it is hot, so this
	// engine's own call-site inlining (`optimize/inline.ts`) is set conservatively here — see
	// `engine/docs/progress.md` §8 for the before/after and the bundle-size effect this was weighed
	// against.
	inlineBudget: { maxStatements: 6, rounds: 3 },
};
