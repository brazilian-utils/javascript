/**
 * The Go backend.
 *
 * Go 1.21, standard library only, ordinary loops and explicit error returns. A `Fail` effect
 * becomes a second return value, so a caller reads exactly like hand written Go; the hoisting
 * pass in the lowerer is what turns a nested fallible call into the familiar
 * `value, err := f(); if err != nil { return zero, err }`.
 *
 * `int` is assumed to be 64 bits, which is true on every platform Go supports today except
 * 32 bit ones; the assumption is recorded in `docs/targets/go.md`.
 */

import type { Backend, DriverEntry, SupportNeeds } from "../../backend/generate.ts";
import { ENGINE_VERSION } from "../../backend/generate.ts";
import type { TargetSpec } from "../../backend/lower.ts";
import type { Candidate } from "../../backend/select.ts";
import { LoweringTable, argIsAscii } from "../../backend/select.ts";
import { asciiString } from "../../backend/tast.ts";
import type { TExpr, TFunc, TModule, TRecord, TStmt } from "../../backend/tast.ts";
import type { CProgram } from "../../core/ir.ts";
import { printRegex } from "../../regex.ts";
import { TRIM_CODE_POINTS } from "../../intrinsics/index.ts";
import type { SemType } from "../../types.ts";
import type { Value } from "../../values.ts";

export const GO_CONFIG = {
	baseline: "Go 1.21",
	fileExtension: ".go",
	packageName: "core",
	dependencies: [] as string[],
	formatter: "gofmt",
	linters: ["go vet", "staticcheck"],
};

export function goType(type: SemType): string {
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
			return "float64";
		case "String":
			return "string";
		case "List":
			return `[]${goType(type.elem)}`;
		case "Option":
			return `*${goType(type.inner)}`;
		case "Record":
			return type.name;
		case "Enum":
			return "string";
		case "Union":
			return type.name;
		case "Lambda":
			return `func(${type.params.map(goType).join(", ")}) ${goType(type.ret)}`;
		case "Void":
			return "";
		case "Never":
			return "any";
		default: {
			const exhaustive: never = type;
			return exhaustive;
		}
	}
}

export function goZero(type: SemType): string {
	switch (type.kind) {
		case "Bool":
			return "false";
		case "Int":
		case "Decimal":
		case "CivilDate":
		case "Instant":
		case "Duration":
			return "0";
		case "Float":
			return "0";
		case "String":
		case "Enum":
			return '""';
		case "List":
		case "Option":
			return "nil";
		case "Record":
			return `${type.name}{}`;
		default:
			return "nil";
	}
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

export const GO_CANDIDATES: readonly Candidate[] = [
	...["add:+", "sub:-", "mul:*", "div:/", "mod:%"].map((entry) => {
		const [op, symbol] = entry.split(":") as [string, string];
		return {
			op: `int.${op}`,
			impl: "native" as const,
			cost: cheap,
			because: op === "div" || op === "mod" ? "Go truncates, which is the Core's rule" : undefined,
			emit: binary(symbol),
		};
	}),
	...["add:+", "sub:-", "mul:*", "div:/"].map((entry) => {
		const [op, symbol] = entry.split(":") as [string, string];
		return { op: `float.${op}`, impl: "native" as const, cost: cheap, emit: binary(symbol) };
	}),
	{ op: "int.neg", impl: "native", cost: cheap, emit: (args) => raw(`-${print(args[0]!)}`) },
	{ op: "float.neg", impl: "native", cost: cheap, emit: (args) => raw(`-${print(args[0]!)}`) },
	{
		op: "int.abs",
		impl: "native",
		cost: cheap,
		emit: (args) => raw(`func() int { if ${print(args[0]!)} < 0 { return -${print(args[0]!)} }; return ${print(args[0]!)} }()`),
	},
	{ op: "int.min", impl: "native", cost: cheap, emit: (args) => raw(`min(${print(args[0]!)}, ${print(args[1]!)})`) },
	{ op: "int.max", impl: "native", cost: cheap, emit: (args) => raw(`max(${print(args[0]!)}, ${print(args[1]!)})`) },
	...["lt:<", "le:<=", "gt:>", "ge:>="].flatMap((entry) => {
		const [op, symbol] = entry.split(":") as [string, string];
		return [
			{ op: `int.${op}`, impl: "native" as const, cost: cheap, emit: binary(symbol) },
			{ op: `float.${op}`, impl: "native" as const, cost: cheap, emit: binary(symbol) },
		];
	}),
	{ op: "float.fromInt", impl: "native", cost: cheap, emit: (args) => raw(`float64(${print(args[0]!)})`) },
	{ op: "core.eq", impl: "native", cost: cheap, emit: binary("==") },

	{
		op: "opt.isNone",
		impl: "native",
		cost: cheap,
		// A binary node rather than a fragment, so negating it prints `!= nil` rather than `!(… == nil)`.
		emit: (args) => ({ kind: "binary", op: "==", left: args[0]!, right: raw("nil") }),
	},
	{
		op: "opt.unwrap",
		impl: "native",
		cost: cheap,
		// Parenthesized: `*x.Field` would dereference the field, not the option.
		emit: (args) => raw(`(*${print(args[0]!)})`),
	},
	{ op: "opt.some", impl: "native", cost: cheap, emit: (args) => raw(`ptr(${print(args[0]!)})`) },
	{
		op: "opt.orElse",
		impl: "native",
		cost: cheap,
		emit: (args, types) =>
			raw(`orElse(${print(args[0]!)}, ${print(args[1]!)})`) as TExpr & { types?: typeof types },
	},

	{
		op: "str.len",
		impl: "native",
		requires: argIsAscii(0),
		because: "`len` counts bytes, which equals the scalar count only for ASCII",
		cost: cheap,
		emit: (args) => raw(`len(${print(args[0]!)})`),
	},
	{
		op: "str.len",
		impl: "native",
		because: "converting to []rune counts scalars, at the cost of one allocation",
		cost: allocating,
		emit: (args) => raw(`len([]rune(${print(args[0]!)}))`),
	},
	{ op: "str.concat", impl: "native", cost: allocating, emit: binary("+") },
	{
		op: "str.codeAt",
		impl: "native",
		requires: argIsAscii(0),
		because: "indexing a string yields a byte",
		cost: cheap,
		emit: (args) => raw(`int(${print(args[0]!)}[${print(args[1]!)}])`),
	},
	{
		op: "str.charAt",
		impl: "native",
		requires: argIsAscii(0),
		cost: allocating,
		emit: (args) => raw(`string(${print(args[0]!)}[${print(args[1]!)}])`),
	},
	{
		op: "str.codeAtOpt",
		impl: "library",
		requires: argIsAscii(0),
		cost: cheap,
		emit: (args) => raw(`codeAt(${print(args[0]!)}, ${print(args[1]!)})`),
	},
	{
		op: "str.charAtOpt",
		impl: "library",
		requires: argIsAscii(0),
		cost: allocating,
		emit: (args) => raw(`charAt(${print(args[0]!)}, ${print(args[1]!)})`),
	},
	{
		op: "str.slice",
		impl: "native",
		requires: argIsAscii(0),
		because: "slicing cuts at byte boundaries",
		cost: cheap,
		emit: (args) => raw(`${print(args[0]!)}[${print(args[1]!)}:${print(args[2]!)}]`),
	},
	{
		op: "str.indexOf",
		impl: "native",
		requires: argIsAscii(0),
		because: "strings.Index returns a byte offset",
		cost: linear,
		deps: ["strings"],
		emit: (args, _types, ctx) => {
			ctx.require("strings");
			return raw(`strings.Index(${print(args[0]!)}, ${print(args[1]!)})`);
		},
	},
	{
		op: "str.contains",
		impl: "native",
		cost: linear,
		deps: ["strings"],
		emit: (args, _types, ctx) => {
			ctx.require("strings");
			return raw(`strings.Contains(${print(args[0]!)}, ${print(args[1]!)})`);
		},
	},
	{
		op: "str.startsWith",
		impl: "native",
		cost: linear,
		deps: ["strings"],
		emit: (args, _types, ctx) => {
			ctx.require("strings");
			return raw(`strings.HasPrefix(${print(args[0]!)}, ${print(args[1]!)})`);
		},
	},
	{
		op: "str.endsWith",
		impl: "native",
		cost: linear,
		deps: ["strings"],
		emit: (args, _types, ctx) => {
			ctx.require("strings");
			return raw(`strings.HasSuffix(${print(args[0]!)}, ${print(args[1]!)})`);
		},
	},
	{
		op: "str.repeat",
		impl: "native",
		cost: allocating,
		deps: ["strings"],
		emit: (args, _types, ctx) => {
			ctx.require("strings");
			return raw(`strings.Repeat(${print(args[0]!)}, ${print(args[1]!)})`);
		},
	},
	{
		op: "str.padStart",
		impl: "library",
		cost: allocating,
		deps: ["_support"],
		emit: (args) => raw(`padStart(${print(args[0]!)}, ${print(args[1]!)}, ${print(args[2]!)})`),
	},
	{
		op: "str.trim",
		impl: "native",
		because: "strings.Trim takes the cut set explicitly, so the 25 code points are exact",
		cost: cheap,
		deps: ["strings"],
		emit: (args, _types, ctx) => {
			ctx.require("strings");
			return raw(
				`strings.Trim(${print(args[0]!)}, ${asciiString(TRIM_CODE_POINTS.map((point) => String.fromCodePoint(point)).join(""))})`,
			);
		},
	},
	{
		op: "str.asciiUpper",
		impl: "native",
		requires: argIsAscii(0),
		because: "strings.ToUpper is only ASCII-equivalent on ASCII input",
		cost: allocating,
		deps: ["strings"],
		emit: (args, _types, ctx) => {
			ctx.require("strings");
			return raw(`strings.ToUpper(${print(args[0]!)})`);
		},
	},
	{
		op: "str.asciiLower",
		impl: "native",
		requires: argIsAscii(0),
		cost: allocating,
		deps: ["strings"],
		emit: (args, _types, ctx) => {
			ctx.require("strings");
			return raw(`strings.ToLower(${print(args[0]!)})`);
		},
	},
	{
		op: "str.asciiUpper",
		impl: "native",
		because: "strings.Map is one pass, and mapping only a-z is the Core's rule for any input",
		cost: allocating,
		deps: ["strings"],
		emit: (args, _types, ctx) => {
			ctx.require("strings");
			return raw(
				`strings.Map(func(scalar rune) rune { if scalar >= 'a' && scalar <= 'z' { return scalar - 32 }; return scalar }, ${print(args[0]!)})`,
			);
		},
	},
	{
		op: "str.asciiLower",
		impl: "native",
		because: "strings.Map is one pass, and mapping only A-Z is the Core's rule for any input",
		cost: allocating,
		deps: ["strings"],
		emit: (args, _types, ctx) => {
			ctx.require("strings");
			return raw(
				`strings.Map(func(scalar rune) rune { if scalar >= 'A' && scalar <= 'Z' { return scalar + 32 }; return scalar }, ${print(args[0]!)})`,
			);
		},
	},
	{
		op: "str.compare",
		impl: "native",
		because: "Go compares UTF-8 bytes, which is code point order",
		cost: linear,
		deps: ["strings"],
		emit: (args, _types, ctx) => {
			ctx.require("strings");
			return raw(`strings.Compare(${print(args[0]!)}, ${print(args[1]!)})`);
		},
	},
	{
		op: "str.codePoints",
		impl: "native",
		requires: argIsAscii(0),
		because: "an ASCII byte is already its own code point, so `[]byte(value)` needs no UTF-8 decode at all, unlike `codePoints`' `range` over the string below",
		cost: allocating,
		emit: (args) =>
			raw(
				`func() []int { __bs := []byte(${print(args[0]!)}); __pts := make([]int, len(__bs)); for __i, __b := range __bs { __pts[__i] = int(__b) }; return __pts }()`,
			),
	},
	{ op: "str.codePoints", impl: "library", cost: allocating, emit: (args) => raw(`codePoints(${print(args[0]!)})`) },
	{
		op: "str.fromCodePoints",
		impl: "native",
		requires: (args) => {
			const elem = args[0];
			return elem !== undefined && elem.kind === "List" && elem.elem.kind === "Int" && elem.elem.lo >= 0 && elem.elem.hi <= 127;
		},
		because:
			"every code point this project ever builds this way is proven ASCII (`group_thousands`' `out`, " +
			"`engine/docs/progress.md` §8), so its byte value is its whole UTF-8 encoding -- one []byte " +
			"built directly and converted once, instead of `fromCodePoints`' []rune round trip below, " +
			"which lets Go's own UTF-8 encoder re-derive what a byte already was",
		cost: allocating,
		emit: (args) =>
			raw(
				`string(func() []byte { __pts := ${print(args[0]!)}; __bs := make([]byte, len(__pts)); for __i, __p := range __pts { __bs[__i] = byte(__p) }; return __bs }())`,
			),
	},
	{ op: "str.fromCodePoints", impl: "library", cost: allocating, emit: (args) => raw(`fromCodePoints(${print(args[0]!)})`) },
	{ op: "str.asAscii", impl: "library", cost: linear, emit: (args) => raw(`asAscii(${print(args[0]!)})`) },
	{ op: "str.asDigits", impl: "library", cost: linear, emit: (args) => raw(`asDigits(${print(args[0]!)})`) },
	{
		op: "str.split",
		impl: "native",
		cost: allocating,
		deps: ["strings"],
		emit: (args, _types, ctx) => {
			ctx.require("strings");
			return raw(`strings.Split(${print(args[0]!)}, ${print(args[1]!)})`);
		},
	},
	{
		op: "str.join",
		impl: "native",
		cost: allocating,
		deps: ["strings"],
		emit: (args, _types, ctx) => {
			ctx.require("strings");
			return raw(`strings.Join(${print(args[0]!)}, ${print(args[1]!)})`);
		},
	},
	{
		op: "str.fromInt",
		impl: "native",
		cost: allocating,
		deps: ["strconv"],
		emit: (args, _types, ctx) => {
			ctx.require("strconv");
			return raw(`strconv.Itoa(${print(args[0]!)})`);
		},
	},
	{ op: "str.parseInt", impl: "library", cost: linear, emit: (args) => raw(`parseDigits(${print(args[0]!)})`) },

	{
		op: "seq.at",
		impl: "library",
		cost: cheap,
		emit: (args) => raw(`at(${print(args[0]!)}, ${print(args[1]!)})`),
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
	{ op: "seq.push", impl: "native", cost: cheap, emit: (args) => raw(`${print(args[0]!)} = append(${print(args[0]!)}, ${print(args[1]!)})`) },
	{ op: "seq.sum", impl: "library", cost: linear, emit: (args) => raw(`sumInts(${print(args[0]!)})`) },
	{ op: "seq.contains", impl: "library", cost: linear, emit: (args) => raw(`contains(${print(args[0]!)}, ${print(args[1]!)})`) },
	{ op: "seq.indexOf", impl: "library", cost: linear, emit: (args) => raw(`indexOf(${print(args[0]!)}, ${print(args[1]!)})`) },
	{ op: "seq.concat", impl: "native", cost: allocating, emit: (args) => raw(`append(append([]${"T"}{}, ${print(args[0]!)}...), ${print(args[1]!)}...)`) },
	{ op: "seq.slice", impl: "native", cost: cheap, emit: (args) => raw(`${print(args[0]!)}[${print(args[1]!)}:${print(args[2]!)}]`) },
	{ op: "seq.reverse", impl: "library", cost: allocating, emit: (args) => raw(`reversed(${print(args[0]!)})`) },
	{
		op: "seq.sortStable",
		impl: "native",
		because: "slices.SortStableFunc is stable, unlike sort.Slice",
		cost: { alloc: "one", time: "nlogn" },
		deps: ["slices"],
		emit: (args, _types, ctx) => {
			ctx.require("slices");
			return raw(`sortedStable(${print(args[0]!)}, ${print(args[1]!)})`);
		},
	},
	{
		op: "seq.sortStableBy",
		impl: "native",
		cost: { alloc: "one", time: "nlogn" },
		deps: ["slices"],
		emit: (args, types) => {
			const keyType = types[1];
			const compare =
				keyType !== undefined && keyType.kind === "Lambda" && keyType.ret.kind === "String"
					? `func(a, b string) int { if a < b { return -1 }; if a > b { return 1 }; return 0 }`
					: `func(a, b int) int { return a - b }`;
			return raw(`sortedStableBy(${print(args[0]!)}, ${print(args[1]!)}, ${compare})`);
		},
	},
	{ op: "seq.map", impl: "library", cost: allocating, emit: (args) => raw(`mapped(${print(args[0]!)}, ${print(args[1]!)})`) },
	{ op: "seq.filter", impl: "library", cost: allocating, emit: (args) => raw(`filtered(${print(args[0]!)}, ${print(args[1]!)})`) },
	{ op: "seq.any", impl: "library", cost: linear, emit: (args) => raw(`anyOf(${print(args[0]!)}, ${print(args[1]!)})`) },
	{ op: "seq.all", impl: "library", cost: linear, emit: (args) => raw(`allOf(${print(args[0]!)}, ${print(args[1]!)})`) },
	{ op: "seq.find", impl: "library", cost: linear, emit: (args) => raw(`found(${print(args[0]!)}, ${print(args[1]!)})`) },

	{ op: "dec.fromScaled", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{ op: "dec.fromInt", impl: "native", cost: cheap, emit: (args, types) => raw(`${print(args[0]!)} * ${10 ** scaleOf(types[1])}`) },
	{ op: "dec.add", impl: "native", cost: cheap, emit: binary("+") },
	{ op: "dec.sub", impl: "native", cost: cheap, emit: binary("-") },
	{ op: "dec.mul", impl: "native", cost: cheap, emit: binary("*") },
	{ op: "dec.compare", impl: "library", cost: cheap, emit: (args) => raw(`compareInts(${print(args[0]!)}, ${print(args[1]!)})`) },
	{ op: "dec.isNegative", impl: "native", cost: cheap, emit: (args) => raw(`${print(args[0]!)} < 0`) },
	{ op: "dec.abs", impl: "library", cost: cheap, emit: (args) => raw(`absInt(${print(args[0]!)})`) },
	{ op: "dec.unscaled", impl: "native", cost: cheap, emit: (args) => args[0]! },

	{
		op: "date.clampEpochDays",
		impl: "native",
		cost: cheap,
		emit: (args) => raw(`min(max(${print(args[0]!)}, -719162), 2932896)`),
	},
	{ op: "date.toEpochDays", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{ op: "date.fromEpochDays", impl: "library", cost: cheap, emit: (args) => raw(`dateFromEpochDays(${print(args[0]!)})`) },
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
	{ op: "date.addDays", impl: "library", cost: cheap, emit: (args) => raw(`dateAddDays(${print(args[0]!)}, ${print(args[1]!)})`) },
	{ op: "date.diffDays", impl: "native", cost: cheap, emit: binary("-") },
	{ op: "date.compare", impl: "library", cost: cheap, emit: (args) => raw(`compareInts(${print(args[0]!)}, ${print(args[1]!)})`) },
	{ op: "date.dayOfWeek", impl: "native", cost: cheap, emit: (args) => raw(`(((${print(args[0]!)}+3)%7+7)%7 + 1)`) },
	{
		op: "date.isLeapYear",
		impl: "native",
		cost: cheap,
		emit: (args) => raw(`((${print(args[0]!)}%4 == 0 && ${print(args[0]!)}%100 != 0) || ${print(args[0]!)}%400 == 0)`),
	},

	{
		// A byte-wise pass, not `strings.Map`, when every retained range is ASCII (every class this
		// project uses is: digits, letters). `strings.Map` decodes the whole input as UTF-8 runes
		// before the callback ever runs; a byte never needs decoding to be range-tested, and a
		// multi-byte scalar's bytes are all >= 0x80, so every one of them fails an ASCII range test
		// on its own and is dropped exactly as decoding and testing the scalar would drop it — a
		// non-ASCII input keeps working, just without ever paying to decode it
		// (`engine/docs/progress.md` §8, same reasoning as the Rust target's `re.retain`).
		op: "re.retain",
		impl: "native",
		because: "a byte-wise scan when every retained range is ASCII",
		cost: allocating,
		emit: (args, _types, ctx) => {
			const ranges = ctx.regex === undefined || ctx.regex.node.kind !== "class" ? [] : ctx.regex.node.ranges;
			const asciiTest = (name: string): string =>
				ranges.length === 0
					? "false"
					: ranges.map((range) => (range.lo === range.hi ? `${name} == ${range.lo}` : `(${name} >= ${range.lo} && ${name} <= ${range.hi})`)).join(" || ");
			if (ranges.every((range) => range.hi <= 127)) {
				return raw(
					`func() string { __value := ${print(args[0]!)}; __out := make([]byte, 0, len(__value)); for __i := 0; __i < len(__value); __i++ { __b := __value[__i]; __c := int(__b); if ${asciiTest("__c")} { __out = append(__out, __b) } }; return string(__out) }()`,
				);
			}
			ctx.require("strings");
			return raw(
				`strings.Map(func(scalar rune) rune { if ${asciiTest("scalar")} { return scalar }; return -1 }, ${print(args[0]!)})`,
			);
		},
	},
	{
		op: "re.test",
		impl: "native",
		because: "the normalized pattern is inside the compatibility subset; \\A…\\z anchors the whole string",
		cost: linear,
		deps: ["regexp"],
		emit: (args, _types, ctx) => {
			ctx.require("regexp");
			const pattern = ctx.regex === undefined ? "" : printRegex(ctx.regex.node, "go");
			return raw(`regexp.MustCompile(${asciiString(`\\A${pattern}\\z`)}).MatchString(${print(args[0]!)})`);
		},
	},

	{
		op: "http.request",
		impl: "native",
		cost: { alloc: "many", time: "linear" },
		emit: (args, _types, ctx) => raw(`${print(ctx.env())}.Request(${print(args[0]!)})`),
	},
	{ op: "clock.now", impl: "native", cost: cheap, emit: (_args, _types, ctx) => raw(`${print(ctx.env())}.Now()`) },
	{ op: "clock.sleep", impl: "native", cost: cheap, emit: (args, _types, ctx) => raw(`${print(ctx.env())}.Sleep(${print(args[0]!)})`) },
	{ op: "clock.millis", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{ op: "clock.durationMillis", impl: "native", cost: cheap, emit: (args) => args[0]! },
	{ op: "clock.elapsed", impl: "native", cost: cheap, emit: (args) => raw(`max(0, ${print(args[1]!)}-${print(args[0]!)})`) },
	{ op: "random.nextU32", impl: "native", cost: cheap, emit: (_args, _types, ctx) => raw(`${print(ctx.env())}.NextU32()`) },
	{
		op: "task.race",
		impl: "library",
		because: "goroutines with a context and a channel are the idiomatic form",
		cost: { alloc: "many", time: "linear" },
		emit: (args) => raw(`raceFirstSome(${print(args[0]!)})`),
	},
];

function scaleOf(type: SemType | undefined): number {
	return type !== undefined && type.kind === "Int" ? Number(type.lo) : 0;
}

export const GO_SPEC: TargetSpec = {
	name: "go",
	table: new LoweringTable(GO_CANDIDATES),
	naming: {
		func: (name, exported) => (exported ? pascal(name) : camel(name)),
		value: (name) => camel(name),
		field: (name) => pascal(name),
		type: (name) => pascal(name),
		module: (path) => `${path.split("/").join("_")}.go`,
	},
	loopCombinators: new Set(["seq.fold", "seq.map", "seq.filter"]),
	statementTernary: true,
	errorsAsValues: true,
	asyncColouring: false,
	envType: { kind: "Record", name: "Capabilities" },
};

function camel(name: string): string {
	const cleaned = name.replace(/[-_](.)/g, (_match, char: string) => char.toUpperCase());
	return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}

function pascal(name: string): string {
	const cleaned = name.replace(/[-_](.)/g, (_match, char: string) => char.toUpperCase());
	return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
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
			return `${print(expr.callee)}(${expr.args.map(print).join(", ")})`;
		case "method":
			return `${print(expr.target)}.${pascal(expr.name)}(${expr.args.map(print).join(", ")})`;
		case "member":
			return `${print(expr.target)}.${expr.name}`;
		case "index":
			return `${print(expr.target)}[${print(expr.index)}]`;
		case "binary":
			return `(${print(expr.left)} ${goOperator(expr.op)} ${print(expr.right)})`;
		case "unary": {
			// `!(a == b)` reads better as `a != b`, and gofmt cannot do that for us.
			if (expr.op === "!" && expr.operand.kind === "binary" && expr.operand.op === "==") {
				return `(${print(expr.operand.left)} != ${print(expr.operand.right)})`;
			}
			// A capability table fragment is opaque, so negating it needs parentheses.
			const operand = print(expr.operand);
			const atomic = expr.operand.kind === "name" || expr.operand.kind === "call" || expr.operand.kind === "method";
			return atomic ? `${expr.op}${operand}` : `${expr.op}(${operand})`;
		}
		case "ternary":
			return `func() ${"any"} { if ${print(expr.test)} { return ${print(expr.then)} }; return ${print(expr.otherwise)} }()`;
		case "list":
			return `[]${goType(expr.type.kind === "List" ? expr.type.elem : expr.type)}{${expr.items.map(print).join(", ")}}`;
		case "record":
			return `${expr.typeName}{${expr.fields.map((field) => `${field.name}: ${print(field.value)}`).join(", ")}}`;
		case "lambda": {
			const params = expr.params.map((param) => `${param.name} ${goType(param.type)}`).join(", ");
			return `func(${params}) ${goType(expr.ret)} {\n${printBody(expr.body, 1)}\n}`;
		}
		case "none":
			return "nil";
		case "zero":
			return goZero(expr.type);
		case "some":
			return `ptr(${print(expr.inner)})`;
		default: {
			const exhaustive: never = expr;
			return exhaustive;
		}
	}
}

function goOperator(op: string): string {
	switch (op) {
		case "===":
			return "==";
		case "!==":
			return "!=";
		case "??":
			return "??";
		default:
			return op;
	}
}

function literal(value: Value, type?: SemType): string {
	if (typeof value === "bigint") return value.toString();
	if (typeof value === "string") return asciiString(value);
	if (typeof value === "boolean") return String(value);
	if (typeof value === "number") return String(value);
	if (Array.isArray(value)) {
		const elem = type !== undefined && type.kind === "List" ? type.elem : undefined;
		const rendered = elem === undefined ? "int" : goType(elem);
		return `[]${rendered}{${value.map((item) => literal(item, elem)).join(", ")}}`;
	}
	return "nil";
}

function printBody(body: readonly TStmt[], depth: number): string {
	return body.map((statement) => printStmt(statement, depth)).join("\n");
}

function printStmt(statement: TStmt, depth: number): string {
	const pad = "\t".repeat(depth);
	switch (statement.kind) {
		case "let":
			return `${pad}${statement.name} := ${print(statement.init)}`;
		case "multiLet":
			return `${pad}${statement.names.join(", ")} := ${print(statement.init)}`;
		case "assign":
			return `${pad}${print(statement.target)} = ${print(statement.value)}`;
		case "if": {
			const head = `${pad}if ${unwrapParens(print(statement.test))} {\n${printBody(statement.then, depth + 1)}\n${pad}}`;
			return statement.otherwise.length === 0
				? head
				: `${head} else {\n${printBody(statement.otherwise, depth + 1)}\n${pad}}`;
		}
		case "switch": {
			const cases = statement.cases
				.map((entry) => `${pad}case ${entry.values.map((value) => literal(value)).join(", ")}:\n${printBody(entry.body, depth + 1)}`)
				.join("\n");
			const fallback =
				statement.otherwise === undefined ? "" : `\n${pad}default:\n${printBody(statement.otherwise, depth + 1)}`;
			return `${pad}switch ${print(statement.subject)} {\n${cases}${fallback}\n${pad}}`;
		}
		case "for": {
			const comparison = statement.step > 0n ? (statement.inclusive ? "<=" : "<") : statement.inclusive ? ">=" : ">";
			const update = statement.step === 1n ? `${statement.name}++` : statement.step === -1n ? `${statement.name}--` : `${statement.name} += ${statement.step}`;
			return `${pad}for ${statement.name} := ${print(statement.from)}; ${statement.name} ${comparison} ${print(statement.to)}; ${update} {\n${printBody(statement.body, depth + 1)}\n${pad}}`;
		}
		case "forEach": {
			// Go refuses to compile a declared local that nothing reads, and the subset allows a
			// `for…of` whose body never touches its binding. The decision is made on the printed
			// body rather than on the AST on purpose: a `raw` emission can carry a reference as
			// text, invisible to a pass that walks nodes, and this search finds those too. It errs
			// the safe way — a name that only looks used still gets its binding, which compiles.
			const body = printBody(statement.body, depth + 1);
			const reads = new RegExp(`\\b${statement.name}\\b`, "u").test(body);
			// `for _ := range xs` is not the answer either: Go rejects a `:=` that binds nothing.
			// A range loop that needs no element is written without the assignment at all.
			const header = reads ? `for _, ${statement.name} := range ` : "for range ";
			return `${pad}${header}${print(statement.iterable)} {\n${body}\n${pad}}`;
		}
		case "return": {
			const values = [statement.value === undefined ? undefined : print(statement.value), ...(statement.extra ?? []).map(print)]
				.filter((item): item is string => item !== undefined)
				.join(", ");
			return `${pad}return${values === "" ? "" : ` ${values}`}`;
		}
		case "throw":
			return `${pad}return ZERO, &${statement.errorClass}{Message: ${statement.args.length === 0 ? '""' : print(statement.args[0]!)}}`;
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

function unwrapParens(text: string): string {
	return text.startsWith("(") && text.endsWith(")") ? text.slice(1, -1) : text;
}

export function printFunction(fn: TFunc): string {
	const params = fn.params.map((param) => `${param.name} ${goType(param.type)}`).join(", ");
	const returns = fn.fails.length > 0 ? `(${goType(fn.ret)}, error)` : goType(fn.ret);
	const doc = fn.doc === undefined ? "" : `${fn.doc.split("\n").map((line) => `// ${line}`.trimEnd()).join("\n")}\n`;
	const body = printBody(fn.body, 1).replaceAll("ZERO", goZero(fn.ret));
	return `${doc}func ${fn.name}(${params}) ${returns} {\n${body}\n}`;
}

export function printRecord(record: TRecord): string {
	const doc = record.doc === undefined ? "" : `// ${record.doc.split("\n")[0]}\n`;
	const fields = record.fields.map((field) => `\t${field.name} ${goType(field.type)}`).join("\n");
	return `${doc}type ${record.name} struct {\n${fields}\n}`;
}

/** A module path as an unexported Go identifier prefix: `is-valid-cpf` becomes `isValidCpf`. */
function identifierPrefix(sourcePath: string): string {
	const parts = sourcePath.split(/[^a-zA-Z0-9]+/u).filter((part) => part !== "");
	return parts
		.map((part, index) => (index === 0 ? part : `${part[0]!.toUpperCase()}${part.slice(1)}`))
		.join("");
}

/**
 * Lifts every `regexp.MustCompile` out of the function bodies and into a package level `var`.
 *
 * `regexp` has no compilation cache, so a `MustCompile` left inside a function recompiles the
 * pattern from its source string on every call. For the mask-tolerant document patterns that is
 * 79x the cost of the match itself, which made the generated validators slower than the handwritten
 * package they replace. Compiling once at package initialisation is both the fix and what a Go
 * author would have written.
 *
 * Every generated file shares one package, so the names carry the module they came from.
 */
function hoistPatterns(module: TModule, body: string): { body: string; declarations: string[] } {
	const names = new Map<string, string>();
	const prefix = identifierPrefix(module.sourcePath);
	const hoisted = body.replaceAll(/regexp\.MustCompile\(("(?:[^"\\]|\\.)*")\)/gu, (_match, literal: string) => {
		const existing = names.get(literal);
		if (existing !== undefined) return existing;
		const name = `${prefix}Pattern${names.size + 1}`;
		names.set(literal, name);
		return name;
	});
	const declarations = [...names].map(([literal, name]) => `var ${name} = regexp.MustCompile(${literal})`);
	return { body: hoisted, declarations };
}

export function printModule(module: TModule): string {
	const printed = [
		...module.records.map(printRecord),
		...module.constants.map(
			(constant) => `var ${constant.name} = ${print(constant.value)}`,
		),
		...module.functions.map(printFunction),
	].join("\n\n");
	const patterns = hoistPatterns(module, printed);
	const body = [...patterns.declarations, patterns.body].join("\n\n");
	const imports = new Set<string>(module.requires.filter((name) => name !== "_support"));
	for (const candidate of ["strings", "strconv", "regexp", "slices"]) {
		if (new RegExp(`\\b${candidate}\\.`).test(body)) imports.add(candidate);
	}
	const importBlock =
		imports.size === 0
			? ""
			: `import (\n${[...imports].sort().map((name) => `\t"${name}"`).join("\n")}\n)\n\n`;
	return `${module.header}\n\npackage ${GO_CONFIG.packageName}\n\n${importBlock}${body}\n`;
}

function importPath(): string {
	// One package, so there are no cross-module imports to compute.
	return "";
}

function supportModule(_program: CProgram, needs: SupportNeeds): { path: string; text: string } {
	const parts = [
		"// Code generated by the logic engine. DO NOT EDIT.",
		`// engine: ${ENGINE_VERSION}`,
		"// source: support",
		"",
		`package ${GO_CONFIG.packageName}`,
		"",
		"import (",
		'\t"slices"',
		")",
		"",
		"// ptr wraps a present value, which is how an Option is represented in Go.",
		"func ptr[T any](value T) *T { return &value }",
		"",
		"// orElse answers the value, or the fallback when the option is absent.",
		"func orElse[T any](value *T, fallback T) T {",
		"\tif value == nil {",
		"\t\treturn fallback",
		"\t}",
		"\treturn *value",
		"}",
		"",
		"func codePoints(value string) []int {",
		"\tpoints := make([]int, 0, len(value))",
		"\tfor _, scalar := range value {",
		"\t\tpoints = append(points, int(scalar))",
		"\t}",
		"\treturn points",
		"}",
		"",
		"func fromCodePoints(points []int) string {",
		"\tscalars := make([]rune, 0, len(points))",
		"\tfor _, point := range points {",
		"\t\tscalars = append(scalars, rune(point))",
		"\t}",
		"\treturn string(scalars)",
		"}",
		"",
		"func asAscii(value string) *string {",
		"\tfor _, scalar := range value {",
		"\t\tif scalar >= 0x80 {",
		"\t\t\treturn nil",
		"\t\t}",
		"\t}",
		"\treturn &value",
		"}",
		"",
		"func asDigits(value string) *string {",
		"\tif value == \"\" {",
		"\t\treturn nil",
		"\t}",
		"\tfor _, scalar := range value {",
		"\t\tif scalar < '0' || scalar > '9' {",
		"\t\t\treturn nil",
		"\t\t}",
		"\t}",
		"\treturn &value",
		"}",
		"",
		"func parseDigits(value string) *int {",
		"\tif value == \"\" || len(value) > 18 {",
		"\t\treturn nil",
		"\t}",
		"\ttotal := 0",
		"\tfor _, scalar := range value {",
		"\t\tif scalar < '0' || scalar > '9' {",
		"\t\t\treturn nil",
		"\t\t}",
		"\t\ttotal = total*10 + int(scalar-'0')",
		"\t}",
		"\treturn &total",
		"}",
		"",
		"func padStart(value string, length int, pad string) string {",
		"\tscalars := []rune(value)",
		"\tif len(scalars) >= length {",
		"\t\treturn value",
		"\t}",
		"\tprefix := make([]rune, 0, length-len(scalars))",
		"\tfor index := 0; index < length-len(scalars); index++ {",
		"\t\tprefix = append(prefix, []rune(pad)...)",
		"\t}",
		"\treturn string(prefix) + value",
		"}",
		"",
		"func codeAt(value string, index int) *int {",
		"\tif index < 0 || index >= len(value) {",
		"\t\treturn nil",
		"\t}",
		"\tpoint := int(value[index])",
		"\treturn &point",
		"}",
		"",
		"func charAt(value string, index int) *string {",
		"\tif index < 0 || index >= len(value) {",
		"\t\treturn nil",
		"\t}",
		"\tscalar := string(value[index])",
		"\treturn &scalar",
		"}",
		"",
		"func compareInts(left int, right int) int {",
		"\tif left < right {",
		"\t\treturn -1",
		"\t}",
		"\tif left > right {",
		"\t\treturn 1",
		"\t}",
		"\treturn 0",
		"}",
		"",
		"func absInt(value int) int {",
		"\tif value < 0 {",
		"\t\treturn -value",
		"\t}",
		"\treturn value",
		"}",
		"",
		"func at[T any](values []T, index int) *T {",
		"\tif index < 0 || index >= len(values) {",
		"\t\treturn nil",
		"\t}",
		"\treturn &values[index]",
		"}",
		"",
		"func sumInts(values []int) int {",
		"\ttotal := 0",
		"\tfor _, value := range values {",
		"\t\ttotal += value",
		"\t}",
		"\treturn total",
		"}",
		"",
		"func contains[T comparable](values []T, needle T) bool {",
		"\treturn slices.Contains(values, needle)",
		"}",
		"",
		"func indexOf[T comparable](values []T, needle T) int {",
		"\treturn slices.Index(values, needle)",
		"}",
		"",
		"func reversed[T any](values []T) []T {",
		"\tout := make([]T, len(values))",
		"\tfor index, value := range values {",
		"\t\tout[len(values)-1-index] = value",
		"\t}",
		"\treturn out",
		"}",
		"",
		"func sortedStable[T any](values []T, compare func(T, T) int) []T {",
		"\tout := make([]T, len(values))",
		"\tcopy(out, values)",
		"\tslices.SortStableFunc(out, compare)",
		"\treturn out",
		"}",
		"",
		"func sortedStableBy[T any, K any](values []T, key func(T) K, compare func(K, K) int) []T {",
		"\tout := make([]T, len(values))",
		"\tcopy(out, values)",
		"\tslices.SortStableFunc(out, func(left T, right T) int { return compare(key(left), key(right)) })",
		"\treturn out",
		"}",
		"",
		"func mapped[T any, R any](values []T, fn func(T) R) []R {",
		"\tout := make([]R, 0, len(values))",
		"\tfor _, value := range values {",
		"\t\tout = append(out, fn(value))",
		"\t}",
		"\treturn out",
		"}",
		"",
		"func filtered[T any](values []T, keep func(T) bool) []T {",
		"\tout := make([]T, 0, len(values))",
		"\tfor _, value := range values {",
		"\t\tif keep(value) {",
		"\t\t\tout = append(out, value)",
		"\t\t}",
		"\t}",
		"\treturn out",
		"}",
		"",
		"func anyOf[T any](values []T, test func(T) bool) bool {",
		"\tfor _, value := range values {",
		"\t\tif test(value) {",
		"\t\t\treturn true",
		"\t\t}",
		"\t}",
		"\treturn false",
		"}",
		"",
		"func allOf[T any](values []T, test func(T) bool) bool {",
		"\tfor _, value := range values {",
		"\t\tif !test(value) {",
		"\t\t\treturn false",
		"\t\t}",
		"\t}",
		"\treturn true",
		"}",
		"",
		"func found[T any](values []T, test func(T) bool) *T {",
		"\tfor _, value := range values {",
		"\t\tif test(value) {",
		"\t\t\treturn ptr(value)",
		"\t\t}",
		"\t}",
		"\treturn nil",
		"}",
		"",
		"func dateFromEpochDays(days int) *int {",
		"\tif days < -719162 || days > 2932896 {",
		"\t\treturn nil",
		"\t}",
		"\treturn &days",
		"}",
		"",
		"func dateAddDays(days int, shift int) *int {",
		"\treturn dateFromEpochDays(days + shift)",
		"}",
		"",
	];
	if (needs.race) {
		parts.push(
			"// raceFirstSome runs idempotent tasks concurrently and takes the first one that answers.",
			"// Cancellation is best effort: a losing goroutine may finish, and its answer is dropped.",
			"func raceFirstSome[T any](tasks []func() *T) *T {",
			"\tresults := make(chan *T, len(tasks))",
			"\tfor _, task := range tasks {",
			"\t\tgo func(run func() *T) {",
			"\t\t\tresults <- run()",
			"\t\t}(task)",
			"\t}",
			"",
			"\tfor index := 0; index < len(tasks); index++ {",
			"\t\tif answer := <-results; answer != nil {",
			"\t\t\treturn answer",
			"\t\t}",
			"\t}",
			"",
			"\treturn nil",
			"}",
			"",
		);
	}
	if (needs.env) {
		parts.push(
			"// HttpHeader is one request or response header.",
			"type HttpHeader struct {",
			"\tName  string",
			"\tValue string",
			"}",
			"",
			"// HttpRequest is a request handed to the environment.",
			"type HttpRequest struct {",
			"\tMethod        string",
			"\tUrl           string",
			"\tHeaders       []HttpHeader",
			"\tBody          string",
			"\tTimeoutMillis int",
			"}",
			"",
			"// HttpResponse is a response from the environment.",
			"type HttpResponse struct {",
			"\tStatus  int",
			"\tHeaders []HttpHeader",
			"\tBody    string",
			"}",
			"",
			"// Capabilities is everything the core needs from the outside world.",
			"type Capabilities interface {",
			"\t// A transport error or a timeout answers nil; a 4xx or 5xx status is a value.",
			"\tRequest(request HttpRequest) *HttpResponse",
			"\tNow() int",
			"\tSleep(milliseconds int)",
			"\tNextU32() int",
			"}",
			"",
		);
	}
	return { path: "support.go", text: parts.join("\n") };
}

function errorsModule(program: CProgram): { path: string; text: string } | undefined {
	const declared = [...program.errors.values()];
	if (declared.length === 0) return undefined;
	const lines = [
		"// Code generated by the logic engine. DO NOT EDIT.",
		`// engine: ${ENGINE_VERSION}`,
		"// source: errors",
		"",
		`package ${GO_CONFIG.packageName}`,
		"",
		'import "errors"',
		"",
		"// ErrDomain is the root every domain error wraps, so errors.Is recognizes the family.",
		'var ErrDomain = errors.New("domain error")',
		"",
	];
	for (const error of declared) {
		lines.push(
			`// ${error.name} ${error.doc?.split("\n")[0] ?? "is a domain error raised by the core."}`,
			`type ${error.name} struct {`,
			"\tMessage string",
			"}",
			"",
			`func (e *${error.name}) Error() string { return e.Message }`,
			"",
			`func (e *${error.name}) Unwrap() error { return ErrDomain }`,
			"",
		);
	}
	return { path: "errors.go", text: lines.join("\n") };
}


/** The generated differential driver, plus the module file that makes the output buildable. */
function driverFiles(_program: CProgram, entries: readonly DriverEntry[]): { path: string; text: string }[] {
	// One argument, decoded from what `encoding/json` produced. It has to be recursive: a JSON
	// array always arrives as `[]interface{}`, whatever the element type, so a `List<Int>` cannot
	// simply be asserted to `[]int` — it has to be walked and converted element by element. The
	// other three drivers get this for free from their languages' own decoding.
	const value = (type: SemType, expr: string): string => {
		if (type.kind === "Record") {
			const definition = _program.records.get(type.name);
			const fields = (definition?.fields ?? []).map((field) => {
				const access = `${expr}.(map[string]interface{})[${JSON.stringify(field.name)}]`;
				switch (field.type.kind) {
					case "Bool":
						return `${pascal(field.name)}: ${access}.(bool)`;
					case "Int":
					case "Decimal":
					case "CivilDate":
						return `${pascal(field.name)}: int(${access}.(float64))`;
					default:
						return `${pascal(field.name)}: ${access}.(string)`;
				}
			});
			return `core.${pascal(type.name)}{${fields.join(", ")}}`;
		}
		switch (type.kind) {
			case "String":
			case "Enum":
				return `${expr}.(string)`;
			case "Bool":
				return `${expr}.(bool)`;
			case "Float":
				return `${expr}.(float64)`;
			case "Int":
			case "Decimal":
			case "CivilDate":
			case "Instant":
			case "Duration":
				return `int(${expr}.(float64))`;
			case "List": {
				const elem = goType(type.elem);
				return [
					`func(raw interface{}) []${elem} {`,
					"\titems := raw.([]interface{})",
					`\tout := make([]${elem}, len(items))`,
					"\tfor index, item := range items {",
					`\t\tout[index] = ${value(type.elem, "item")}`,
					"\t}",
					"\treturn out",
					`}(${expr})`,
				].join("\n");
			}
			default:
				return `${expr}.(${goType(type)})`;
		}
	};

	const decode = (type: SemType, index: number): string => value(type, `args[${index}]`);

	const cases = entries.map((entry) => {
		const call = `${entry.targetName}(${[
			...entry.params.map((param, index) => decode(param, index)),
			...(entry.usesEnv ? ["environment"] : []),
		].join(", ")})`;
		if (entry.fails.length > 0) {
			return [
				`\tcase ${JSON.stringify(entry.coreName)}:`,
				`\t\tvalue, err := core.${call}`,
				"\t\tif err != nil {",
				"\t\t\treturn nil, err",
				"\t\t}",
				"\t\treturn value, nil",
			].join("\n");
		}
		return [`\tcase ${JSON.stringify(entry.coreName)}:`, `\t\treturn core.${call}, nil`].join("\n");
	});

	const main = [
		"// Code generated by the logic engine. DO NOT EDIT.",
		"// source: _driver",
		"",
		"package main",
		"",
		"import (",
		'\t"bufio"',
		'\t"encoding/json"',
		'\t"fmt"',
		'\t"os"',
		...(entries.some((entry) => entry.usesEnv) ? ['\t"time"'] : []),
		"",
		'\t"coreout"',
		")",
		"",
		"type request struct {",
		'\tFn   string        `json:"fn"`',
		'\tArgs []interface{} `json:"args"`',
		"}",
		"",
		"func dispatch(name string, args []interface{}) (interface{}, error) {",
		"\tswitch name {",
		...cases,
		"\t}",
		'\treturn nil, fmt.Errorf("unknown function %s", name)',
		"}",
		"",
		...(entries.some((entry) => entry.usesEnv)
			? [
					"// pcg32 is the reference PCG32: same constants and default seed as the interpreter's, so",
					"// a draw matches the reference bit for bit. A fresh instance is built for every request,",
					"// the same way the reference model starts a fresh interpreter -- and so a fresh generator",
					"// -- per case.",
					"type pcg32 struct {",
					"\tstate     uint64",
					"\tincrement uint64",
					"}",
					"",
					"func newPcg32(seed uint64) *pcg32 {",
					"\tp := &pcg32{increment: 1442695040888963407}",
					"\tp.next()",
					"\tp.state += seed",
					"\tp.next()",
					"\treturn p",
					"}",
					"",
					"func (p *pcg32) next() int {",
					"\tprevious := p.state",
					"\tp.state = previous*6364136223846793005 + p.increment",
					"\txorshifted := uint32(((previous >> 18) ^ previous) >> 27)",
					"\trotation := uint32(previous >> 59)",
					"\treturn int((xorshifted >> rotation) | (xorshifted << ((-rotation) & 31)))",
					"}",
					"",
					"// defaultSeed is the interpreter's own default: its constructor falls back to this seed",
					"// whenever Capabilities.seed is left unset, which is how every conformance case runs it.",
					"const defaultSeed uint64 = 0x853c49e6748fea9b",
					"",
					"// fakeCapabilities is the capability fake the differential harness drives: responses",
					"// come from fixtures.json, a URL that is missing models a transport error, and the",
					"// scripted latency is what decides a race.",
					"type fixture struct {",
					'\tStatus        int    `json:"status"`',
					'\tBody          string `json:"body"`',
					'\tLatencyMillis int    `json:"latencyMillis"`',
					"}",
					"",
					"type fakeCapabilities struct {",
					"\tfixtures map[string]fixture",
					"\trandom   *pcg32",
					"}",
					"",
					"func (f fakeCapabilities) Request(request core.HttpRequest) *core.HttpResponse {",
					"\tanswer, ok := f.fixtures[request.Url]",
					"\tif !ok {",
					"\t\treturn nil",
					"\t}",
					"\ttime.Sleep(time.Duration(answer.LatencyMillis) * time.Millisecond)",
					"\treturn &core.HttpResponse{Status: answer.Status, Headers: []core.HttpHeader{}, Body: answer.Body}",
					"}",
					"",
					"func (f fakeCapabilities) Now() int { return 0 }",
					"",
					"func (f fakeCapabilities) Sleep(milliseconds int) {",
					"\ttime.Sleep(time.Duration(milliseconds) * time.Millisecond)",
					"}",
					"",
					"func (f fakeCapabilities) NextU32() int { return f.random.next() }",
					"",
					"// A missing fixture file leaves every URL unanswered, which is a transport error.",
					"var fixtures map[string]fixture = loadFixtures()",
					"",
					"var environment core.Capabilities",
					"",
					"// newEnvironment builds a fresh capability fake, so NextU32 starts from the same state",
					"// the reference model's fresh interpreter starts from for every case.",
					"func newEnvironment() core.Capabilities {",
					"\treturn fakeCapabilities{fixtures: fixtures, random: newPcg32(defaultSeed)}",
					"}",
					"",
					"func loadFixtures() map[string]fixture {",
					"\tfixtures := map[string]fixture{}",
					'\traw, err := os.ReadFile("fixtures.json")',
					"\tif err == nil {",
					"\t\tif err := json.Unmarshal(raw, &fixtures); err != nil {",
					"\t\t\tpanic(err)",
					"\t\t}",
					"\t}",
					"\treturn fixtures",
					"}",
					"",
				]
			: []),
		"func main() {",

		"\tscanner := bufio.NewScanner(os.Stdin)",
		"\tscanner.Buffer(make([]byte, 1024*1024), 1024*1024)",
		"",
		"\tfor scanner.Scan() {",
		'\t\tif scanner.Text() == "" {',
		"\t\t\tcontinue",
		"\t\t}",
		"",
		"\t\tvar parsed request",
		"\t\tif err := json.Unmarshal(scanner.Bytes(), &parsed); err != nil {",
		"\t\t\tpanic(err)",
		"\t\t}",
		"",
		...(entries.some((entry) => entry.usesEnv)
			? [
					"\t\t// A fresh environment per line: NextU32 starts from the same state the reference",
					"\t\t// model's fresh interpreter starts from for every case.",
					"\t\tenvironment = newEnvironment()",
					"",
				]
			: []),
		"\t\tvalue, err := dispatch(parsed.Fn, parsed.Args)",
		"\t\tif err != nil {",
		'\t\t\tout, _ := json.Marshal(map[string]interface{}{"ok": false, "error": errorName(err)})',
		"\t\t\tfmt.Println(string(out))",
		"\t\t\tcontinue",
		"\t\t}",
		"",
		'\t\tout, _ := json.Marshal(map[string]interface{}{"ok": true, "value": value})',
		"\t\tfmt.Println(string(out))",
		"\t}",
		"}",
		"",
		"func errorName(err error) string {",
		'\treturn fmt.Sprintf("%T", err)[len("*core."):]',
		"}",
		"",
	].join("\n");

	return [
		{ path: "cmd/driver/main.go", text: main },
		{ path: "go.mod", text: `module coreout\n\ngo 1.21\n` },
	];
}

export const GO_BACKEND: Backend = {
	spec: GO_SPEC,
	fileExtension: GO_CONFIG.fileExtension,
	printModule,
	importPath,
	support: supportModule,
	errorsModule,
	renderType: goType,
	comment: "//",
	driver: driverFiles,
};
