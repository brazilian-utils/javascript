/**
 * The regex subset: what it accepts, what it refuses, and that a normalized pattern means the
 * same thing as the JavaScript literal it came from.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { RegexError, normalizeRegex, printRegex, regexMatches } from "../src/regex.ts";
import { codePointsOf } from "../src/values.ts";

const PATTERNS = [
	"^[0-9]{3}$",
	"^[0-9]{3}[ .\\-/]*[0-9]{2}$",
	"^(?:abc|de)+$",
	"^[A-Z][0-9]?$",
	"^[^0-9]+$",
	"^[0-9]{2,4}$",
	"^a*b+c?$",
];

const INPUTS = ["", "123", "12", "abc", "abcde", "de", "A1", "A", "aaabbc", "123.45", "1234", "x"];

test("a normalized pattern matches what the JavaScript literal matches", () => {
	for (const pattern of PATTERNS) {
		const normalized = normalizeRegex(pattern);
		const native = new RegExp(pattern, "u");
		for (const input of INPUTS) {
			assert.equal(
				regexMatches(normalized, codePointsOf(input)),
				native.test(input),
				`${pattern} disagreed on ${JSON.stringify(input)}`,
			);
		}
	}
});

test("a printed pattern still matches what the original did", () => {
	for (const pattern of PATTERNS) {
		const printed = printRegex(normalizeRegex(pattern).node, "javascript");
		const native = new RegExp(`^${printed}$`, "u");
		const original = new RegExp(pattern, "u");
		for (const input of INPUTS) {
			assert.equal(native.test(input), original.test(input), `${printed} disagreed on ${JSON.stringify(input)}`);
		}
	}
});

test("RE2 gets code points in its own syntax", () => {
	const printed = printRegex(normalizeRegex("^[\\u00e0-\\u00ff]$").node, "go");
	assert.ok(printed.includes("\\x{e0}"), printed);
	assert.ok(!printed.includes("\\u"), printed);
});

test("the shorthand classes are refused", () => {
	for (const pattern of ["^\\d+$", "^\\w+$", "^\\s+$", "^a\\b$"]) {
		assert.throws(() => normalizeRegex(pattern), RegexError, pattern);
	}
});

test("lookaround, laziness and unanchored patterns are refused", () => {
	for (const pattern of ["^(?=a)a$", "^a*?$", "[0-9]+", "^.$"]) {
		assert.throws(() => normalizeRegex(pattern), RegexError, pattern);
	}
});

test("a digits-only pattern is recognized as a refinement", () => {
	const normalized = normalizeRegex("^[0-9]{11}$");
	assert.equal(normalized.digitsOnly, true);
	assert.equal(normalized.asciiOnly, true);
	assert.equal(normalized.minLength, 11);
	assert.equal(normalized.maxLength, 11);
});
