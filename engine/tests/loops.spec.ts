/**
 * Loop control flow, which is where the analysis is easiest to get wrong.
 *
 * `break` and `continue` do not leave the function: an assignment made just before one is live on
 * the next iteration, or after the loop. A checker that walks only the path falling out of the
 * body would miss that and prove a range the loop can exceed — these tests pin that it does not.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { typeToString } from "../src/types.ts";
import { codesOf, compileSource } from "./helpers.ts";

function rejects(code: string, body: string): void {
	const codes = codesOf({ "utility.ts": body });
	assert.ok(codes.includes(code), `expected ${code}, got ${codes.join(", ") || "no diagnostics"}`);
}

test("a value assigned before `continue` is live on the next iteration", () => {
	rejects(
		"E_RETURN_TYPE",
		`export function f(items: List<Digits, 2, 20>): IntRange<0, 0> {
	let x: IntRange<0, 19> = 0;

	for (let i = 0; i < items.length; i++) {
		if (i === 0) {
			x = 15;
			continue;
		}
	}

	return x;
}`,
	);
});

test("a value assigned before `break` is live after the loop", () => {
	rejects(
		"E_RETURN_TYPE",
		`export function f(items: List<Digits, 2, 20>): IntRange<0, 0> {
	let x: IntRange<0, 19> = 0;

	for (let i = 0; i < items.length; i++) {
		if (i === 0) {
			x = 15;
			break;
		}
	}

	return x;
}`,
	);
});

test("an index widened on a `continue` path cannot be used unchecked", () => {
	rejects(
		"E_SIGNATURE",
		`export function f(items: List<Digits, 2, 20>, table: List<Int, 10, 10>): Int {
	let index: IntRange<0, 19> = 0;

	for (let position = 0; position < items.length; position++) {
		if (position === 0) {
			index = 15;
			continue;
		}

		return seq.get(table, index);
	}

	return 0;
}`,
	);
});

test("the range a loop really holds is the one the checker reports", () => {
	const compilation = compileSource({
		"lib/helpers.ts": `export function lastSeen(values: List<IntRange<0, 9>, 1, 4>): Int {
	let seen: IntRange<0, 9> = 0;

	for (const value of values) {
		if (value === 3) {
			seen = 7;
			continue;
		}

		seen = value;
	}

	return seen;
}`,
		"utility.ts": `import { lastSeen } from "./lib/helpers";

export function f(values: List<IntRange<0, 9>, 1, 4>): Int {
	return lastSeen(values);
}`,
	});
	const helper = compilation.program.functions.get("lib/helpers::lastSeen");
	assert.ok(helper !== undefined);
	assert.equal(typeToString(helper.ret), "Int[0..9]");
});

test("a `break` that ends a switch case is dropped rather than translated", () => {
	const compilation = compileSource({
		"utility.ts": `export type Kind = "a" | "b";

export function f(kind: Kind, values: List<IntRange<0, 9>, 1, 5>): IntRange<0, 100> {
	let total: IntRange<0, 100> = 0;

	for (const value of values) {
		switch (kind) {
			case "a":
				total += value;
				break;
			default:
				total += 1;
		}
	}

	return total;
}`,
	});
	const fn = compilation.program.functions.get("utility::f");
	assert.ok(fn !== undefined);
	// A target that prints a switch as a chain of conditionals would read a kept `break` as
	// leaving the loop, which is not what the source says.
	assert.ok(
		!JSON.stringify(fn.body, (_key, value: unknown) => (typeof value === "bigint" ? value.toString() : value)).includes(
			'"break"',
		),
		"the switch case's break reached the Core",
	);
});

test("a `break` that leaves a switch case early is refused", () => {
	rejects(
		"E_SWITCH_BREAK",
		`export type Kind = "a" | "b";

export function f(kind: Kind, value: IntRange<0, 9>): Int {
	let total: Int = 0;

	switch (kind) {
		case "a":
			if (value > 3) {
				break;
			}

			total = 1;
			break;
		default:
			total = 2;
	}

	return total;
}`,
	);
});
