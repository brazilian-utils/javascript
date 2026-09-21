/**
 * Every construct the subset rejects has a test, and every test asserts on the diagnostic code so
 * the message can be rewritten without breaking the suite.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { codesOf } from "./helpers.ts";

function rejects(code: string, body: string): void {
	const codes = codesOf({ "utility.ts": body });
	assert.ok(codes.includes(code), `expected ${code}, got ${codes.join(", ") || "no diagnostics"}`);
}

test("bare number is rejected", () => {
	rejects("E_BARE_NUMBER", "export function f(value: number): boolean { return value > 0; }");
});

test("any is rejected", () => {
	rejects("E_ANY", "export function f(value: any): boolean { return true; }");
});

test("null is rejected", () => {
	rejects("E_NULL", "export function f(value: string): boolean { return value === null; }");
});

test("loose equality is rejected", () => {
	rejects("E_LOOSE_EQUALITY", "export function f(value: Int): boolean { return value == 1; }");
});

test("while loops are rejected", () => {
	rejects(
		"E_WHILE",
		"export function f(value: Int): boolean { while (value > 0) { value = value - 1; } return true; }",
	);
});

test("try/catch is rejected", () => {
	rejects("E_TRY", "export function f(value: Int): boolean { try { return true; } catch { return false; } }");
});

test("host globals are rejected", () => {
	rejects("E_HOST_GLOBAL", "export function f(): Float { return Math.random(); }");
});

test("truthiness is rejected", () => {
	rejects("E_TRUTHINESS", "export function f(value: Int): boolean { if (value) { return true; } return false; }");
});

test("an unproven index is rejected", () => {
	rejects(
		"E_SIGNATURE",
		"export function f(value: Ascii, index: Int): Int { return str.codeAt(value, index); }",
	);
});

test("a possibly zero divisor is rejected", () => {
	rejects("E_SIGNATURE", "export function f(left: Int, right: Int): Int { return left / right; }");
});

test("a string that is not proven ASCII cannot be indexed", () => {
	rejects("E_SIGNATURE", "export function f(value: string): Int { return str.codeAt(value, 0); }");
});

test("recursion is rejected", () => {
	rejects(
		"E_RECURSION",
		"export function f(value: IntRange<0, 10>): Int { return value === 0 ? 0 : f(value - 1); }",
	);
});

test("an unannotated return type is rejected", () => {
	rejects("E_MISSING_RETURN_TYPE", "export function f(value: Int) { return value; }");
});

test("a regex with \\d is rejected", () => {
	rejects(
		"E_REGEX",
		"const PATTERN = /^\\d+$/;\nexport function f(value: string): boolean { return re.test(PATTERN, value); }",
	);
});

test("an unanchored regex is rejected", () => {
	rejects(
		"E_REGEX",
		"const PATTERN = /[0-9]+/;\nexport function f(value: string): boolean { return re.test(PATTERN, value); }",
	);
});

test("a non-exhaustive switch is rejected", () => {
	rejects(
		"E_NON_EXHAUSTIVE",
		`export type Version = "1" | "2";
export function f(value: Version): Int {
	switch (value) {
		case "1":
			return 1;
	}
	return 0;
}`,
	);
});

test("mutating a non-local is rejected", () => {
	rejects(
		"E_ASSIGN_TARGET",
		`export type Point = { x: Int };
export function f(point: Point): Int { point.x = 1; return point.x; }`,
	);
});

test("interpolating a non-string is rejected", () => {
	rejects("E_INTERPOLATION", "export function f(value: Int): string { return `${value}`; }");
});

test("a float compared with === is rejected", () => {
	rejects("E_SIGNATURE", "export function f(left: Float, right: Float): boolean { return left === right; }");
});
