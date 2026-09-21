/**
 * `str`: operations on immutable sequences of Unicode scalars.
 *
 * Positional operations (`charAt`, `codeAt`, `slice`) are admitted only on `Ascii`, where the
 * index means the same thing in every target: a byte in Go, a `str` position in Python, a code
 * unit in TypeScript. Generic `String` supports iteration by scalar instead, so no target ever
 * has to reproduce UTF-16 indexing.
 */

import {
	MAX_COLLECTION_LENGTH,
	tInt,
	tList,
	tOption,
	tString,
	typeToString,
	weakerClass,
} from "../types.ts";
import type { SemType } from "../types.ts";
import {
	NONE,
	asBigInt,
	asList,
	asString,
	codePointsOf,
	compareScalars,
	fromCodePoints,
	some,
} from "../values.ts";
import { SignatureError, defineIntrinsic, expectArity, expectKind, expectStringClass } from "./registry.ts";

const SCALAR = () => tInt(0n, 0x10ffffn);

/** Proves that `index` can only address a scalar that `text` certainly has. */
function proveIndex(name: string, text: Extract<SemType, { kind: "String" }>, index: SemType): void {
	if (index.kind !== "Int") throw new SignatureError(`${name}: the index must be an Int`);
	if (index.lo < 0n) {
		throw new SignatureError(
			`${name}: the index may be negative (${typeToString(index)})`,
			"guard the index, or derive it from a proven length",
		);
	}
	if (index.hi >= BigInt(text.min)) {
		throw new SignatureError(
			`${name}: the index may address past the end of a ${typeToString(text)} (index ${typeToString(index)})`,
			"narrow the string's length first, for example with a regex guard or a `length` check",
		);
	}
}

defineIntrinsic({
	name: "str.len",
	doc: "Number of Unicode scalars in the string.",
	signature: (args) => {
		expectArity("str.len", args, 1);
		const text = expectKind("str.len", args, 0, "String");
		return tInt(BigInt(text.min), BigInt(text.max));
	},
	evaluate: ([text]) => BigInt(codePointsOf(asString(text!)).length),
});

defineIntrinsic({
	name: "str.codePoints",
	doc: "The scalars of the string, as code points.",
	signature: (args) => {
		expectArity("str.codePoints", args, 1);
		const text = expectKind("str.codePoints", args, 0, "String");
		const elem =
			text.cls === "digits" ? tInt(0x30n, 0x39n) : text.cls === "ascii" ? tInt(0n, 0x7fn) : SCALAR();
		return tList(elem, text.min, text.max);
	},
	evaluate: ([text]) => codePointsOf(asString(text!)).map((point) => BigInt(point)),
});

defineIntrinsic({
	name: "str.fromCodePoints",
	doc: "Builds a string from code points.",
	signature: (args) => {
		expectArity("str.fromCodePoints", args, 1);
		const list = expectKind("str.fromCodePoints", args, 0, "List");
		const elem = list.elem;
		if (elem.kind !== "Int") throw new SignatureError("str.fromCodePoints: expects a list of Int");
		const cls =
			elem.lo >= 0x30n && elem.hi <= 0x39n ? "digits" : elem.hi <= 0x7fn ? "ascii" : "none";
		return tString(cls, list.min, list.max);
	},
	evaluate: ([list]) => fromCodePoints(asList(list!).map((point) => Number(asBigInt(point)))),
});

defineIntrinsic({
	name: "str.concat",
	doc: "Concatenation. Also the lowering of `+` on strings.",
	signature: (args) => {
		expectArity("str.concat", args, 2);
		const left = expectKind("str.concat", args, 0, "String");
		const right = expectKind("str.concat", args, 1, "String");
		return tString(
			weakerClass(left.cls, right.cls),
			Math.min(left.min + right.min, MAX_COLLECTION_LENGTH),
			Math.min(left.max + right.max, MAX_COLLECTION_LENGTH),
		);
	},
	evaluate: ([left, right]) => `${asString(left!)}${asString(right!)}`,
});

defineIntrinsic({
	name: "str.codeAt",
	doc: "Code point at an ASCII position. The index must be proven in range.",
	signature: (args) => {
		expectArity("str.codeAt", args, 2);
		const text = expectStringClass("str.codeAt", args, 0, "ascii");
		proveIndex("str.codeAt", text, args[1]!);
		return text.cls === "digits" ? tInt(0x30n, 0x39n) : tInt(0n, 0x7fn);
	},
	evaluate: ([text, index]) => BigInt(codePointsOf(asString(text!))[Number(asBigInt(index!))]!),
});

defineIntrinsic({
	name: "str.charAt",
	doc: "The one-scalar string at an ASCII position. The index must be proven in range.",
	signature: (args) => {
		expectArity("str.charAt", args, 2);
		const text = expectStringClass("str.charAt", args, 0, "ascii");
		proveIndex("str.charAt", text, args[1]!);
		return tString(text.cls, 1, 1);
	},
	evaluate: ([text, index]) => asString(text!)[Number(asBigInt(index!))]!,
});

defineIntrinsic({
	name: "str.codeAtOpt",
	doc: "Code point at an ASCII position, or `none` when the index is outside. The checked form of str.codeAt.",
	signature: (args) => {
		expectArity("str.codeAtOpt", args, 2);
		const text = expectStringClass("str.codeAtOpt", args, 0, "ascii");
		expectKind("str.codeAtOpt", args, 1, "Int");
		return tOption(text.cls === "digits" ? tInt(0x30n, 0x39n) : tInt(0n, 0x7fn));
	},
	evaluate: ([text, index]) => {
		const value = asString(text!);
		const position = Number(asBigInt(index!));
		return position < 0 || position >= value.length ? NONE : some(BigInt(value.codePointAt(position)!));
	},
});

defineIntrinsic({
	name: "str.charAtOpt",
	doc: "The one-scalar string at an ASCII position, or `none` when the index is outside. The checked form of str.charAt.",
	signature: (args) => {
		expectArity("str.charAtOpt", args, 2);
		const text = expectStringClass("str.charAtOpt", args, 0, "ascii");
		expectKind("str.charAtOpt", args, 1, "Int");
		return tOption(tString(text.cls, 1, 1));
	},
	evaluate: ([text, index]) => {
		const value = asString(text!);
		const position = Number(asBigInt(index!));
		return position < 0 || position >= value.length ? NONE : some(value[position]!);
	},
});

defineIntrinsic({
	name: "str.slice",
	doc: "A slice of an ASCII string, clamped to its length, from inclusive to exclusive.",
	signature: (args) => {
		expectArity("str.slice", args, 3);
		const text = expectStringClass("str.slice", args, 0, "ascii");
		const from = expectKind("str.slice", args, 1, "Int");
		const to = expectKind("str.slice", args, 2, "Int");
		if (from.lo < 0n || to.lo < 0n) {
			throw new SignatureError("str.slice: negative bounds are outside the subset", "clamp the bounds first");
		}
		const min = Math.max(0, Number(to.lo - from.hi));
		const max = Math.min(Number(to.hi - from.lo), text.max);
		return tString(text.cls, Math.max(0, Math.min(min, max)), Math.max(0, max));
	},
	evaluate: ([text, from, to]) =>
		fromCodePoints(
			codePointsOf(asString(text!)).slice(Number(asBigInt(from!)), Number(asBigInt(to!))),
		),
});

defineIntrinsic({
	name: "str.indexOf",
	doc: "Scalar index of the first occurrence of `needle`, or -1.",
	signature: (args) => {
		expectArity("str.indexOf", args, 2);
		const text = expectKind("str.indexOf", args, 0, "String");
		expectKind("str.indexOf", args, 1, "String");
		return tInt(-1n, BigInt(Math.max(0, text.max - 1)));
	},
	evaluate: ([text, needle]) => {
		const haystack = codePointsOf(asString(text!));
		const target = codePointsOf(asString(needle!));
		for (let index = 0; index + target.length <= haystack.length; index++) {
			if (target.every((point, offset) => haystack[index + offset] === point)) return BigInt(index);
		}
		return -1n;
	},
});

defineIntrinsic({
	name: "str.contains",
	doc: "Whether `needle` occurs in the string.",
	signature: (args) => {
		expectArity("str.contains", args, 2);
		expectKind("str.contains", args, 0, "String");
		expectKind("str.contains", args, 1, "String");
		return { kind: "Bool" };
	},
	evaluate: ([text, needle]) => asString(text!).includes(asString(needle!)),
});

defineIntrinsic({
	name: "str.startsWith",
	doc: "Whether the string starts with `prefix`.",
	signature: (args) => {
		expectArity("str.startsWith", args, 2);
		expectKind("str.startsWith", args, 0, "String");
		expectKind("str.startsWith", args, 1, "String");
		return { kind: "Bool" };
	},
	evaluate: ([text, prefix]) => asString(text!).startsWith(asString(prefix!)),
});

defineIntrinsic({
	name: "str.endsWith",
	doc: "Whether the string ends with `suffix`.",
	signature: (args) => {
		expectArity("str.endsWith", args, 2);
		expectKind("str.endsWith", args, 0, "String");
		expectKind("str.endsWith", args, 1, "String");
		return { kind: "Bool" };
	},
	evaluate: ([text, suffix]) => asString(text!).endsWith(asString(suffix!)),
});

defineIntrinsic({
	name: "str.repeat",
	doc: "The string repeated `count` times.",
	signature: (args) => {
		expectArity("str.repeat", args, 2);
		const text = expectKind("str.repeat", args, 0, "String");
		const count = expectKind("str.repeat", args, 1, "Int");
		if (count.lo < 0n) throw new SignatureError("str.repeat: the count may be negative");
		return tString(
			text.cls,
			Math.min(text.min * Number(count.lo), MAX_COLLECTION_LENGTH),
			Math.min(text.max * Number(count.hi), MAX_COLLECTION_LENGTH),
		);
	},
	evaluate: ([text, count]) => asString(text!).repeat(Number(asBigInt(count!))),
});

defineIntrinsic({
	name: "str.padStart",
	doc: "Left pads with `pad` (one scalar) until the string has `length` scalars.",
	signature: (args) => {
		expectArity("str.padStart", args, 3);
		const text = expectKind("str.padStart", args, 0, "String");
		const length = expectKind("str.padStart", args, 1, "Int");
		const pad = expectKind("str.padStart", args, 2, "String");
		if (pad.min !== 1 || pad.max !== 1) {
			throw new SignatureError(
				"str.padStart: the padding must be exactly one scalar",
				"pass a one character literal; repeated multi-scalar padding truncates differently across targets",
			);
		}
		return tString(
			weakerClass(text.cls, pad.cls),
			Math.min(Math.max(text.min, Number(length.lo)), MAX_COLLECTION_LENGTH),
			Math.min(Math.max(text.max, Number(length.hi)), MAX_COLLECTION_LENGTH),
		);
	},
	evaluate: ([text, length, pad]) => {
		const points = codePointsOf(asString(text!));
		const target = Number(asBigInt(length!));
		const missing = Math.max(0, target - points.length);
		return `${asString(pad!).repeat(missing)}${asString(text!)}`;
	},
});

/** The 25 code points JavaScript's `String#trim` removes, specified explicitly. */
const JS_WHITESPACE = new Set([
	0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x20, 0xa0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005,
	0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff,
]);

export const TRIM_CODE_POINTS: readonly number[] = [...JS_WHITESPACE].sort((a, b) => a - b);

defineIntrinsic({
	name: "str.trim",
	doc: "Removes leading and trailing whitespace, using the 25 code points JavaScript trims.",
	signature: (args) => {
		expectArity("str.trim", args, 1);
		const text = expectKind("str.trim", args, 0, "String");
		return tString(text.cls, 0, text.max);
	},
	evaluate: ([text]) => {
		const points = codePointsOf(asString(text!));
		let start = 0;
		let end = points.length;
		while (start < end && JS_WHITESPACE.has(points[start]!)) start++;
		while (end > start && JS_WHITESPACE.has(points[end - 1]!)) end--;
		return fromCodePoints(points.slice(start, end));
	},
});

defineIntrinsic({
	name: "str.asciiUpper",
	doc: "ASCII-only upper casing: a-z map to A-Z, every other scalar is left alone. Defined on any string; a proven-ASCII argument unlocks the host's own case mapping.",
	signature: (args) => {
		expectArity("str.asciiUpper", args, 1);
		const text = expectKind("str.asciiUpper", args, 0, "String");
		return tString(text.cls, text.min, text.max);
	},
	evaluate: ([text]) => asString(text!).replaceAll(/[a-z]/g, (char) => char.toUpperCase()),
});

defineIntrinsic({
	name: "str.asciiLower",
	doc: "ASCII-only lower casing: A-Z map to a-z, every other scalar is left alone. Defined on any string; a proven-ASCII argument unlocks the host's own case mapping.",
	signature: (args) => {
		expectArity("str.asciiLower", args, 1);
		const text = expectKind("str.asciiLower", args, 0, "String");
		return tString(text.cls, text.min, text.max);
	},
	evaluate: ([text]) => asString(text!).replaceAll(/[A-Z]/g, (char) => char.toLowerCase()),
});

defineIntrinsic({
	name: "str.compare",
	doc: "Scalar-order comparison: -1, 0 or 1. Never the host's collation.",
	signature: (args) => {
		expectArity("str.compare", args, 2);
		expectKind("str.compare", args, 0, "String");
		expectKind("str.compare", args, 1, "String");
		return tInt(-1n, 1n);
	},
	evaluate: ([left, right]) => BigInt(compareScalars(asString(left!), asString(right!))),
});

defineIntrinsic({
	name: "str.asAscii",
	doc: "Checked conversion: `some` when every scalar is below 0x80.",
	signature: (args) => {
		expectArity("str.asAscii", args, 1);
		const text = expectKind("str.asAscii", args, 0, "String");
		return tOption(tString("ascii", text.min, text.max));
	},
	evaluate: ([text]) => {
		const value = asString(text!);
		return codePointsOf(value).every((point) => point < 0x80) ? some(value) : NONE;
	},
});

defineIntrinsic({
	name: "str.asDigits",
	doc: "Checked conversion: `some` when every scalar is an ASCII digit.",
	signature: (args) => {
		expectArity("str.asDigits", args, 1);
		const text = expectKind("str.asDigits", args, 0, "String");
		return tOption(tString("digits", text.min, text.max));
	},
	evaluate: ([text]) => {
		const value = asString(text!);
		const points = codePointsOf(value);
		return points.length > 0 && points.every((point) => point >= 0x30 && point <= 0x39)
			? some(value)
			: NONE;
	},
});

defineIntrinsic({
	name: "str.split",
	doc: "Splits on a one-scalar ASCII separator.",
	signature: (args) => {
		expectArity("str.split", args, 2);
		const text = expectKind("str.split", args, 0, "String");
		const separator = expectStringClass("str.split", args, 1, "ascii");
		if (separator.min !== 1 || separator.max !== 1) {
			throw new SignatureError("str.split: the separator must be exactly one scalar");
		}
		return tList(tString(text.cls, 0, text.max), 1, Math.max(1, text.max + 1));
	},
	evaluate: ([text, separator]) => asString(text!).split(asString(separator!)),
});

defineIntrinsic({
	name: "str.join",
	doc: "Joins a list of strings with a separator.",
	signature: (args) => {
		expectArity("str.join", args, 2);
		const list = expectKind("str.join", args, 0, "List");
		const separator = expectKind("str.join", args, 1, "String");
		if (list.elem.kind !== "String") throw new SignatureError("str.join: expects a list of strings");
		return tString(
			weakerClass(list.elem.cls, separator.cls),
			0,
			Math.min(list.max * (list.elem.max + separator.max), MAX_COLLECTION_LENGTH),
		);
	},
	evaluate: ([list, separator]) =>
		asList(list!)
			.map((item) => asString(item))
			.join(asString(separator!)),
});

defineIntrinsic({
	name: "str.fromInt",
	doc: "Decimal representation of an integer, with a leading '-' when negative.",
	signature: (args) => {
		expectArity("str.fromInt", args, 1);
		const value = expectKind("str.fromInt", args, 0, "Int");
		const digits = Math.max(value.lo.toString().length, value.hi.toString().length);
		return tString(value.lo >= 0n ? "digits" : "ascii", 1, digits);
	},
	evaluate: ([value]) => asBigInt(value!).toString(),
});

defineIntrinsic({
	name: "str.parseInt",
	doc: "Parses an unsigned decimal integer; `none` when the string is empty or not all digits.",
	signature: (args) => {
		expectArity("str.parseInt", args, 1);
		const text = expectKind("str.parseInt", args, 0, "String");
		const bound = 10n ** BigInt(Math.min(text.max, 18)) - 1n;
		return tOption(tInt(0n, bound));
	},
	evaluate: ([text]) => {
		const value = asString(text!);
		if (value.length === 0 || value.length > 18) return NONE;
		return /^[0-9]+$/.test(value) ? some(BigInt(value)) : NONE;
	},
});
