/**
 * What a `switch` does to the scope around it.
 *
 * A case is a branch like any other, so what it leaves behind has to reach the code after the
 * switch — the same join `if`/`else` takes, and the same one a loop's fixpoint takes. The checker
 * used to compute each case's ending state for the exhaustiveness check and then throw it away,
 * restoring the state from before the switch: an assignment inside a case was invisible
 * afterwards, and a range proven on top of that was a range the program exceeds.
 *
 * The random program generator found it (`docs/fuzzing.md`), on a `switch` inside a loop whose
 * accumulator the checker proved unchanged while the interpreter multiplied it seven times. These
 * tests pin the join itself, so the finding survives the seed that produced it.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { codesOf } from "./helpers.ts";

function rejects(code: string, body: string): void {
	const codes = codesOf({ "utility.ts": body });
	assert.ok(codes.includes(code), `expected ${code}, got ${codes.join(", ") || "no diagnostics"}`);
}

function accepts(body: string): void {
	const codes = codesOf({ "utility.ts": body });
	assert.deepEqual(codes, [], `expected no diagnostics, got ${codes.join(", ")}`);
}

test("an assignment inside a case is live after the switch", () => {
	rejects(
		"E_RETURN_TYPE",
		`type Kind = "a" | "b";

export function f(kind: Kind): IntRange<0, 0> {
	let x: IntRange<0, 7> = 0;

	switch (kind) {
		case "a":
			x = 7;
			break;
		default:
			break;
	}

	return x;
}`,
	);
});

test("a case's assignment reaches the next iteration of the enclosing loop", () => {
	rejects(
		"E_RETURN_TYPE",
		`type Kind = "a" | "b";

export function f(kind: Kind, items: List<Digits, 2, 20>): IntRange<1, 1> {
	let total: IntRange<1, 64> = 1;

	for (let i = 0; i < items.length; i++) {
		switch (kind) {
			case "a":
				total = int.min(total * 2, 64);
				break;
			default:
				break;
		}
	}

	return total;
}`,
	);
});

test("the join covers every case, not only the last one", () => {
	rejects(
		"E_RETURN_TYPE",
		`type Kind = "a" | "b" | "c";

export function f(kind: Kind): IntRange<0, 2> {
	let x: IntRange<0, 9> = 0;

	switch (kind) {
		case "a":
			x = 1;
			break;
		case "b":
			x = 2;
			break;
		default:
			x = 9;
			break;
	}

	return x;
}`,
	);
});

test("a case that returns contributes nothing to the state after the switch", () => {
	accepts(
		`type Kind = "a" | "b";

export function f(kind: Kind): IntRange<0, 1> {
	let x: IntRange<0, 9> = 0;

	switch (kind) {
		case "a":
			x = 9;
			return 1;
		default:
			break;
	}

	return x;
}`,
	);
});
