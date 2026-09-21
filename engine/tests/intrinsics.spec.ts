/**
 * Intrinsic vectors.
 *
 * This is the layer of conformance that scales: every intrinsic is checked against its own
 * vectors, independently of any utility, so a lowering that disagrees with the specification is
 * caught once rather than once per caller.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { allIntrinsics, lookupIntrinsic } from "../src/intrinsics/index.ts";
import type { EvalContext } from "../src/intrinsics/index.ts";
import { NONE, asString, civilDate, decimal, some, valuesEqual } from "../src/values.ts";
import type { Value } from "../src/values.ts";

const CONTEXT: EvalContext = {
	http: () => undefined,
	now: () => 0n,
	sleep: () => undefined,
	nextU32: () => 0n,
};

function evaluate(name: string, args: Value[]): Value {
	const intrinsic = lookupIntrinsic(name);
	assert.ok(intrinsic !== undefined, `unknown intrinsic ${name}`);
	return intrinsic.evaluate(args, CONTEXT);
}

function vector(name: string, args: Value[], expected: Value): void {
	const actual = evaluate(name, args);
	assert.ok(
		valuesEqual(actual, expected),
		`${name}(${args.map((arg) => String(arg)).join(", ")}) was ${String(actual)}, expected ${String(expected)}`,
	);
}

test("string operations count scalars, not code units", () => {
	vector("str.len", ["café"], 5n);
	vector("str.len", ["\u{1f600}"], 1n);
	vector("str.codePoints", ["a\u{1f600}"], [97n, 0x1f600n]);
	vector("str.fromCodePoints", [[97n, 0x1f600n]], "a\u{1f600}");
});

test("trim removes exactly the 25 code points JavaScript trims", () => {
	vector("str.trim", ["  a "], "a");
	vector("str.trim", ["﻿ a ﻿"], "a");
	// U+0085 is whitespace to Python's str.strip but not to JavaScript's trim.
	vector("str.trim", ["\u0085a\u0085"], "\u0085a\u0085");
});

test("ASCII case mapping leaves everything else alone", () => {
	vector("str.asciiUpper", ["straße"], "STRAßE");
	vector("str.asciiLower", ["STRAßE"], "straße");
});

test("comparison is in scalar order, not UTF-16 order", () => {
	// U+1F600 is above U+FFFD as a scalar, but its surrogate pair sorts below in UTF-16.
	vector("str.compare", ["\u{1f600}", "�"], 1n);
	vector("str.compare", ["a", "b"], -1n);
	vector("str.compare", ["ab", "ab"], 0n);
});

test("integer division and remainder truncate toward zero", () => {
	vector("int.div", [-7n, 2n], -3n);
	vector("int.mod", [-7n, 2n], -1n);
	vector("int.mod", [7n, -2n], 1n);
});

test("decimal arithmetic is exact and names its rounding", () => {
	vector("dec.add", [decimal(1234n, 2), decimal(1n, 2)], decimal(1235n, 2));
	vector("dec.mul", [decimal(150n, 2), decimal(3n, 1)], decimal(450n, 3));
	vector("dec.rescale", [decimal(1235n, 3), 2n, "half-even"], decimal(124n, 2));
	vector("dec.rescale", [decimal(1245n, 3), 2n, "half-even"], decimal(124n, 2));
	vector("dec.rescale", [decimal(1245n, 3), 2n, "half-up"], decimal(125n, 2));
	vector("dec.divRound", [decimal(100n, 2), decimal(300n, 2), 4n, "half-up"], decimal(3333n, 4));
});

test("a float converts through its exact binary value", () => {
	// 1.005 is really 1.00499999999999989..., which is why half-up gives 1.00 here.
	vector("dec.fromFloat", [1.005, 2n, "half-up"], decimal(100n, 2));
	vector("dec.fromFloat", [2.5, 0n, "half-even"], decimal(2n, 0));
	vector("dec.fromFloat", [3.5, 0n, "half-even"], decimal(4n, 0));
});

test("civil dates are exact across the supported range", () => {
	vector("date.fromYmd", [2024n, 2n, 29n], some(civilDate(19782)));
	vector("date.fromYmd", [2023n, 2n, 29n], NONE);
	vector("date.dayOfWeek", [civilDate(0)], 4n);
	vector("date.diffDays", [civilDate(10), civilDate(3)], 7n);
	vector("date.year", [civilDate(-719162)], 1n);
	vector("date.fromEpochDays", [-719163n], NONE);
});

test("sorting is stable and compares keys in scalar order", () => {
	const items = [
		{ __kind: "record" as const, type: "R", fields: { key: 1n, tag: "a" } },
		{ __kind: "record" as const, type: "R", fields: { key: 0n, tag: "b" } },
		{ __kind: "record" as const, type: "R", fields: { key: 1n, tag: "c" } },
	];
	const sorted = evaluate("seq.sortStableBy", [
		items,
		{ __kind: "lambda", call: (args) => (args[0] as (typeof items)[number]).fields["key"]! },
	]);
	assert.deepEqual(
		(sorted as typeof items).map((item) => asString(item.fields["tag"]!)),
		["b", "a", "c"],
	);
});

test("every intrinsic has documentation", () => {
	for (const intrinsic of allIntrinsics()) {
		assert.ok(intrinsic.doc.length > 10, `${intrinsic.name} has no documentation`);
	}
});
