/**
 * The idiomatic-TypeScript frontend: for every form the recognizer maps, the idiomatic spelling
 * and the namespace spelling must produce the *same* Core — that equivalence is the whole
 * correctness argument (docs/semantics.md is updated to describe the subset in these terms), so
 * it is asserted here directly rather than testing the two spellings separately.
 *
 * Forms the recognizer cannot map soundly are rejected instead, in `subset.spec.ts`'s style: each
 * test asserts on the diagnostic code, and the block below it is the message an author who does
 * not know this engine actually reads.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { dumpProgram } from "../src/api.ts";
import { compileSource } from "./helpers.ts";
import { codesOf } from "./helpers.ts";

/** The dumped Core of one function, isolated from the rest of the program (the stdlib, in every case). */
function coreOf(source: string, fn = "f"): string {
	const compilation = compileSource({ "utility.ts": source });
	const dump = dumpProgram(compilation.program);
	const marker = `\nfn utility::${fn}(`;
	const start = dump.indexOf(marker);
	assert.ok(start >= 0, `missing function utility::${fn} in:\n${dump}`);
	const rest = dump.slice(start + 1);
	const end = rest.indexOf("\n\nfn ");
	return (end === -1 ? rest : rest.slice(0, end)).trim();
}

/** Asserts that the idiomatic spelling and the namespace spelling check to the identical Core. */
function sameCore(idiomatic: string, namespaceForm: string, fn = "f"): void {
	assert.equal(coreOf(idiomatic, fn), coreOf(namespaceForm, fn));
}

function rejects(code: string, body: string): void {
	const codes = codesOf({ "utility.ts": body });
	assert.ok(codes.includes(code), `expected ${code}, got ${codes.join(", ") || "no diagnostics"}`);
}

/* ==================================================================== *
 * Strings
 * ==================================================================== */

test("value.charCodeAt(i) on a proven-ASCII string is str.codeAt", () => {
	sameCore(
		"export function f(value: AsciiOf<5>, index: IntRange<0, 4>): Int { return value.charCodeAt(index); }",
		"export function f(value: AsciiOf<5>, index: IntRange<0, 4>): Int { return str.codeAt(value, index); }",
	);
});

test("value.charAt(i) on a proven-ASCII string is str.charAt", () => {
	sameCore(
		"export function f(value: AsciiOf<5>, index: IntRange<0, 4>): string { return value.charAt(index); }",
		"export function f(value: AsciiOf<5>, index: IntRange<0, 4>): string { return str.charAt(value, index); }",
	);
});

test("value[i] on a proven-ASCII string with a proven index is also str.charAt", () => {
	sameCore(
		"export function f(value: AsciiOf<5>, index: IntRange<0, 4>): string { return value[index]; }",
		"export function f(value: AsciiOf<5>, index: IntRange<0, 4>): string { return str.charAt(value, index); }",
	);
});

test("value[i] with an unprovable index is the checked str.charAtOpt, an Option", () => {
	sameCore(
		"export function f(value: Ascii, index: Int): string | undefined { return value[index]; }",
		"export function f(value: Ascii, index: Int): string | undefined { return str.charAtOpt(value, index); }",
	);
});

test("value.slice(a, b) on a proven-ASCII string is str.slice", () => {
	sameCore(
		"export function f(value: Ascii, a: IntRange<0, 10>, b: IntRange<0, 10>): string { return value.slice(a, b); }",
		"export function f(value: Ascii, a: IntRange<0, 10>, b: IntRange<0, 10>): string { return str.slice(value, a, b); }",
	);
});

test("value.trim() is str.trim", () => {
	sameCore(
		"export function f(value: string): string { return value.trim(); }",
		"export function f(value: string): string { return str.trim(value); }",
	);
});

test("value.padStart(n, c) is str.padStart", () => {
	sameCore(
		'export function f(value: string): string { return value.padStart(5, "0"); }',
		'export function f(value: string): string { return str.padStart(value, 5, "0"); }',
	);
});

test("value.length on a string is str.len", () => {
	sameCore(
		"export function f(value: string): Int { return value.length; }",
		"export function f(value: string): Int { return str.len(value); }",
	);
});

test("String(n) on an Int is str.fromInt", () => {
	sameCore(
		"export function f(value: Int): string { return String(value); }",
		"export function f(value: Int): string { return str.fromInt(value); }",
	);
});

test("n.toString() on an Int is str.fromInt", () => {
	sameCore(
		"export function f(value: Int): string { return value.toString(); }",
		"export function f(value: Int): string { return str.fromInt(value); }",
	);
});

test("[...s] is str.codePoints", () => {
	sameCore(
		"export function f(value: string): List<Int> { return [...value]; }",
		"export function f(value: string): List<Int> { return str.codePoints(value); }",
	);
});

test('value.replace(/[^0-9]/g, "") is re.retain on the class', () => {
	sameCore(
		'export function f(value: string): string { return value.replace(/[^0-9]/g, ""); }',
		'const DIGIT = /^[0-9]$/;\nexport function f(value: string): string { return re.retain(DIGIT, value); }',
	);
});

test("PATTERN.test(value) on a module-level regex constant is re.test", () => {
	sameCore(
		"const PATTERN = /^[0-9]+$/;\nexport function f(value: string): boolean { return PATTERN.test(value); }",
		"const PATTERN = /^[0-9]+$/;\nexport function f(value: string): boolean { return re.test(PATTERN, value); }",
	);
});

/* ==================================================================== *
 * Lists
 * ==================================================================== */

test("xs.length on a list is seq.len", () => {
	sameCore(
		"export function f(xs: List<Int>): Int { return xs.length; }",
		"export function f(xs: List<Int>): Int { return seq.len(xs); }",
	);
});

test("xs[i] with a proven index is seq.get", () => {
	sameCore(
		"export function f(xs: List<Int, 5, 5>, index: IntRange<0, 4>): Int { return xs[index]; }",
		"export function f(xs: List<Int, 5, 5>, index: IntRange<0, 4>): Int { return seq.get(xs, index); }",
	);
});

test("xs[i] with an unprovable index is the checked seq.at, an Option", () => {
	sameCore(
		"export function f(xs: List<Int>, index: Int): Int | undefined { return xs[index]; }",
		"export function f(xs: List<Int>, index: Int): Int | undefined { return seq.at(xs, index); }",
	);
});

/* ==================================================================== *
 * Numbers
 * ==================================================================== */

test("Math.min on Int is int.min", () => {
	sameCore(
		"export function f(a: Int, b: Int): Int { return Math.min(a, b); }",
		"export function f(a: Int, b: Int): Int { return int.min(a, b); }",
	);
});

test("Math.max on Int is int.max", () => {
	sameCore(
		"export function f(a: Int, b: Int): Int { return Math.max(a, b); }",
		"export function f(a: Int, b: Int): Int { return int.max(a, b); }",
	);
});

test("Math.abs on Int is int.abs", () => {
	sameCore(
		"export function f(a: Int): Int { return Math.abs(a); }",
		"export function f(a: Int): Int { return int.abs(a); }",
	);
});

test("Math.trunc on an already-exact Int is the identity", () => {
	sameCore(
		"export function f(a: Int): Int { return Math.trunc(a); }",
		"export function f(a: Int): Int { return a; }",
	);
});

test("Math.floor on an already-exact Int is the identity", () => {
	sameCore(
		"export function f(a: Int): Int { return Math.floor(a); }",
		"export function f(a: Int): Int { return a; }",
	);
});

/* ==================================================================== *
 * Forms with no sound mapping: a diagnostic is the deliverable, not a lowering.
 * ==================================================================== */

test("charCodeAt on a string that is not proven ASCII is rejected, not silently lowered", () => {
	rejects(
		"E_UTF16_POSITION",
		"export function f(value: string, index: Int): Int { return value.charCodeAt(index); }",
	);
});

test("s[i] on a string that is not proven ASCII is rejected", () => {
	rejects(
		"E_UTF16_POSITION",
		"export function f(value: string, index: Int): string | undefined { return value[index]; }",
	);
});

test("slice on a string that is not proven ASCII is rejected", () => {
	rejects(
		"E_UTF16_POSITION",
		"export function f(value: string, a: Int, b: Int): string { return value.slice(a, b); }",
	);
});

test("Math.random() is rejected: the Random capability offers only nextU32", () => {
	rejects("E_MATH_RANDOM", "export function f(): Float { return Math.random(); }");
});

test("Math.min on Float is rejected: there is no float.min", () => {
	rejects(
		"E_MATH_FLOAT",
		"export function f(a: Float, b: Float): Float { return Math.min(a, b); }",
	);
});

test("new Date(...) is rejected: it has no proleptic-Gregorian, non-rolling equivalent", () => {
	rejects(
		"E_HOST_DATE",
		"export function f(y: Int, m: Int, d: Int): CivilDate { return new Date(y, m, d); }",
	);
});

test("spreading two lists together is rejected: only [...s] on a single string is admitted", () => {
	rejects(
		"E_ARRAY_SPREAD",
		"export function f(xs: List<Int>, ys: List<Int>): List<Int> { return [...xs, ...ys]; }",
	);
});

test(".replace without the g flag is rejected: it would rewrite only the first match", () => {
	rejects(
		"E_REPLACE_UNSUPPORTED",
		'export function f(value: string): string { return value.replace(/[^0-9]/, ""); }',
	);
});

test(".replace with a pattern that is not a single class is rejected", () => {
	rejects(
		"E_REPLACE_UNSUPPORTED",
		'export function f(value: string): string { return value.replace(/[^0-9]{2}/g, ""); }',
	);
});
