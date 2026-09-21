/**
 * What the checker must *accept*: the refinements that make a native lowering safe.
 *
 * Each case pins the inferred type, because the range and the character class are the proof a
 * backend reads when it picks a representation or a native call.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { typeToString } from "../src/types.ts";
import { compileSource } from "./helpers.ts";

/**
 * The inferred result of a library helper.
 *
 * A utility keeps its declared signature, because that signature is the published contract; a
 * helper is specialized per call site, so its type is what the analysis actually proved.
 */
function helperType(source: string, fn: string, entry: string): string {
	const compilation = compileSource({ "lib/helpers.ts": source, "utility.ts": entry });
	const target = compilation.program.functions.get(`lib/helpers::${fn}`);
	assert.ok(target !== undefined, `missing ${fn}`);
	return typeToString(target.ret);
}

/** A one line utility that calls the helper under test, so the helper is specialized. */
const ENTRY = [
	'import { HELPER } from "./lib/helpers";',
	"",
	"export function f(ARGUMENT): Int {",
	"\treturn HELPER(value);",
	"}",
	"",
].join("\n");

function compiles(files: Record<string, string>): void {
	assert.doesNotThrow(() => compileSource(files));
}

test("a regex guard refines the class and the length of a string", () => {
	const source = `const PATTERN = /^[0-9]{11}$/;

export function digitOf(value: string): Int {
	if (!re.test(PATTERN, value)) {
		return -1;
	}

	// Provable only because the guard proved 11 digits: the class and the length both come from
	// the pattern itself.
	return str.codeAt(value, 10) - 48;
}`;
	assert.equal(
		helperType(
			source,
			"digitOf",
			ENTRY.replaceAll("HELPER", "digitOf").replace("ARGUMENT", "value: string"),
		),
		"Int[-1..9]",
	);
});

test("a length check narrows a string so indexing is provable", () => {
	const source = `export function lastDigit(value: Digits): Int {
	if (value.length !== 3) {
		return -1;
	}

	return str.codeAt(value, 2) - 48;
}`;
	assert.equal(
		helperType(
			source,
			"lastDigit",
			ENTRY.replaceAll("HELPER", "lastDigit").replace("ARGUMENT", "value: Digits"),
		),
		"Int[-1..9]",
	);
});

test("a loop proves the exact range of an accumulator", () => {
	const source = `export function sumOf(value: DigitsOf<3>): IntRange<0, 27> {
	let total: IntRange<0, 27> = 0;

	for (let index = 0; index < 3; index++) {
		total += str.codeAt(value, index) - 48;
	}

	return total;
}`;
	assert.equal(
		helperType(source, "sumOf", ENTRY.replaceAll("HELPER", "sumOf").replace("ARGUMENT", "value: DigitsOf<3>")),
		"Int[0..27]",
	);
});

test("a comparison narrows an integer in both branches", () => {
	const source = `export function clamped(value: IntRange<0, 20>): IntRange<0, 9> {
	return value < 2 ? 0 : (value > 10 ? 9 : value - 2);
}`;
	assert.equal(
		helperType(source, "clamped", ENTRY.replaceAll("HELPER", "clamped").replace("ARGUMENT", "value: IntRange<0, 20>")),
		"Int[0..9]",
	);
});

test("an Option is narrowed by an explicit undefined check", () => {
	compiles({
		"utility.ts": `export function f(value: string): Int {
	const digits = str.asDigits(value);

	if (digits === undefined) {
		return -1;
	}

	return digits.length;
}`,
	});
});

test("a refinement crosses a function boundary through specialization", () => {
	const source = `function digitAt(value: Digits, index: Int): IntRange<0, 9> {
	return str.codeAt(value, index) - 48;
}

export function f(value: DigitsOf<4>): IntRange<0, 9> {
	return digitAt(value, 3);
}`;
	const compilation = compileSource({ "utility.ts": source });
	const specialized = compilation.program.functions.get("utility::digitAt");
	assert.ok(specialized !== undefined, "the helper was not specialized");
	assert.equal(typeToString(specialized.params[0]!.type), "Digits[4]");
});

test("a string that is only ASCII after a checked conversion may be indexed", () => {
	compiles({
		"utility.ts": `export function f(value: string): Int {
	const ascii = str.asAscii(value);

	if (ascii === undefined) {
		return -1;
	}

	if (ascii.length === 0) {
		return -2;
	}

	// Both facts are needed here: ASCII from the conversion, non-empty from the length check.
	return str.codeAt(ascii, 0);
}`,
	});
});
