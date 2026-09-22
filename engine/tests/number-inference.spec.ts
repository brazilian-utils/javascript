/**
 * What the checker does with a bare `number` (docs/subset-gaps.md, "`number` as a parameter or
 * return type").
 *
 * A parameter's range comes from one of two places — a guard the body writes, for a utility with
 * no call site of its own to take it from, or the call sites themselves, for library code, the
 * same specialization an explicit `Int` already gets (ADR 0004). Neither is available, the
 * refusal is the deliverable: it has to name the parameter, say what could not be proven, and
 * name the guard to add, in ordinary code.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { typeToString } from "../src/types.ts";
import { compileSource, diagnosticsOf } from "./helpers.ts";

function paramType(source: string, fn: string, param: string): string {
	const compilation = compileSource({ "utility.ts": source });
	const target = compilation.program.functions.get(`utility::${fn}`);
	assert.ok(target !== undefined, `missing ${fn}`);
	const binding = target.params.find((item) => item.name === param);
	assert.ok(binding !== undefined, `missing parameter ${param}`);
	return typeToString(binding.type);
}

function retType(source: string, fn: string): string {
	const compilation = compileSource({ "utility.ts": source });
	const target = compilation.program.functions.get(`utility::${fn}`);
	assert.ok(target !== undefined, `missing ${fn}`);
	return typeToString(target.ret);
}

test("a utility's `number` parameter takes its range from an early-exit guard", () => {
	const source = `export function clampedInput(n: number): number {
	if (n < 0 || n > 99) {
		return 0;
	}

	return n;
}`;
	assert.equal(paramType(source, "clampedInput", "n"), "Int[0..99]");
	assert.equal(retType(source, "clampedInput"), "Int[0..99]");
});

test("a `number` return type is always inferred from the body, no declared ceiling to stay under", () => {
	const source = `export function sumOfDigits(value: DigitsOf<3>): number {
	return str.codeAt(value, 0) - 48 + (str.codeAt(value, 1) - 48) + (str.codeAt(value, 2) - 48);
}`;
	assert.equal(retType(source, "sumOfDigits"), "Int[0..27]");
});

test("a `number` return type is inferred the same way for a parameter that is itself a refinement", () => {
	const source = `export function firstDigitValue(value: DigitsOf<11>): number {
	return str.codeAt(value, 0) - 48;
}`;
	assert.equal(retType(source, "firstDigitValue"), "Int[0..9]");
});

test("a library helper's `number` parameter is specialized per call site, exactly like Int", () => {
	const source = `function digitAt(value: Digits, index: number): number {
	return value.charCodeAt(index) - 48;
}

export function f(value: DigitsOf<4>): IntRange<0, 9> {
	return digitAt(value, 3);
}`;
	// Unoptimized, because this is about what the checker proved, and the optimizer acts on that
	// proof: an `Int[3..3]` parameter is folded to the constant at every read and then dropped from
	// the signature entirely. The test below covers that half.
	const compilation = compileSource({ "utility.ts": source }, { noOptimize: true });
	const specialized = compilation.program.functions.get("utility::digitAt");
	assert.ok(specialized !== undefined, "the helper was not specialized");
	assert.equal(typeToString(specialized.params[0]!.type), "Digits[4]");
	// The index came from the call site (a proven literal 3), not the wide default `number` starts as.
	assert.equal(typeToString(specialized.params[1]!.type), "Int[3..3]");
	assert.equal(typeToString(specialized.ret), "Int[0..9]");
});

test("a parameter proven to be one integer is folded to it and then dropped from the signature", () => {
	const source = `function digitAt(value: Digits, index: number): number {
	return value.charCodeAt(index) - 48;
}

export function f(value: DigitsOf<4>): IntRange<0, 9> {
	return digitAt(value, 3);
}`;
	const specialized = compileSource({ "utility.ts": source }).program.functions.get("utility::digitAt");
	assert.ok(specialized !== undefined, "the helper was not specialized");
	// `index` is gone: every read of it became `3`, which left nothing for the parameter to carry.
	// Go and Rust both refuse to compile an unused parameter, so this is correctness, not tidiness.
	assert.deepEqual(
		specialized.params.map((param) => param.name),
		["value"],
	);
});

test("an exported `number` parameter no guard narrows is refused, naming the guard to add", () => {
	const diagnostics = diagnosticsOf({
		"utility.ts": `export function isPositive(n: number): boolean {
	return n > 0;
}`,
	});
	assert.equal(diagnostics.length, 1);
	const [diagnostic] = diagnostics;
	assert.equal(diagnostic!.code, "E_BARE_NUMBER");
	assert.equal(
		diagnostic!.message,
		"`n` is a bare `number`, and `isPositive` never narrows it before using it",
	);
	assert.equal(
		diagnostic!.suggestion,
		"add a guard before n is used, for example `if (n < 0 || n > 99) return …;` — the range a " +
			"guard like that proves becomes n's published contract; write `n: Int` instead if the full " +
			"range really is what is meant",
	);
});

test("an exported `number` parameter that is never used at all is refused, not silently accepted", () => {
	const diagnostics = diagnosticsOf({
		"utility.ts": `export function alwaysTrue(n: number): boolean {
	return true;
}`,
	});
	assert.equal(diagnostics.length, 1);
	const [diagnostic] = diagnostics;
	assert.equal(diagnostic!.code, "E_BARE_NUMBER");
	assert.equal(diagnostic!.message, "`n` is never used, so `alwaysTrue` proves nothing about its range");
	assert.equal(
		diagnostic!.suggestion,
		"remove the parameter, or write `n: Int` if the full range really is what is meant",
	);
});

test("reading a `number` parameter both inside and outside a guard still refuses", () => {
	// `n` is read once inside the guard (excluded — the guard's own test proves nothing about a use
	// that has not happened yet) and once for real before the guard runs, so nothing narrows the
	// value at the point it is actually used.
	const diagnostics = diagnosticsOf({
		"utility.ts": `export function unclamped(n: number): number {
	const raw = n;

	if (n < 0 || n > 99) {
		return 0;
	}

	return raw;
}`,
	});
	assert.equal(diagnostics.length, 1);
	assert.equal(diagnostics[0]!.code, "E_BARE_NUMBER");
});

test("an explicit `Int` still opts out of inference and needs no guard", () => {
	const compilation = compileSource({
		"utility.ts": `export function identity(n: Int): Int {
	return n;
}`,
	});
	const target = compilation.program.functions.get("utility::identity");
	assert.ok(target !== undefined);
	assert.equal(typeToString(target.params[0]!.type), "Int[-9007199254740991..9007199254740991]");
});
