/**
 * What the TypeScript target's inlining is allowed to cost.
 *
 * The npm package this engine generates for is tree-shakeable, and ADR 0012 records that as a
 * requirement: a consumer who imports one utility must not carry another. So for that one target
 * inlining is not a free win — every copy of a callee is bytes over the wire — and the budget
 * that bounds it is asserted here rather than remembered. `engine/scripts/size.ts` measures the
 * result the way a consumer's bundler would; these tests cover the decisions behind it.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { dumpProgram } from "../src/api.ts";
import { generate } from "../src/backend/generate.ts";
import { inlineCalls } from "../src/optimize/inline.ts";
import { TYPESCRIPT_BACKEND } from "../src/targets/typescript/index.ts";
import { PYTHON_BACKEND } from "../src/targets/python/index.ts";
import { compileSource } from "./helpers.ts";

/** The generated TypeScript of one file, by its path in the output. */
function generated(source: string, path: string, backend = TYPESCRIPT_BACKEND): string {
	const result = generate(compileSource({ "utility.ts": source }).program, backend);
	const file = result.files.find((candidate) => candidate.path === path);
	assert.ok(file !== undefined, `no ${path} in ${result.files.map((each) => each.path).join(", ")}`);
	return file.text;
}

const SMALL_HELPER_MANY_CALLS = `function digitAt(value: Digits, index: Int): IntRange<0, 9> {
	return value.charCodeAt(index) - 48;
}

export function f(value: DigitsOf<4>): IntRange<0, 36> {
	return digitAt(value, 0) + digitAt(value, 1) + digitAt(value, 2) + digitAt(value, 3);
}`;

test("a one-expression helper is substituted as an expression, not through a synthetic Option", () => {
	const text = generated(SMALL_HELPER_MANY_CALLS, "utility.ts");
	assert.match(text, /charCodeAt/u, "the helper's body did not reach the call site");
	assert.doesNotMatch(text, /Result/u, "the splice went through the early-return sentinel");
	assert.doesNotMatch(text, /const _inl\d+Value/u, "a literal or local argument was bound instead of substituted");
});

const BIG_HELPER_MANY_CALLS = `function classify(value: Digits, index: Int): IntRange<0, 4> {
	const digit = value.charCodeAt(index) - 48;

	if (digit === 0) {
		return 0;
	}

	if (digit < 3) {
		return 1;
	}

	if (digit < 6) {
		return 2;
	}

	if (digit < 9) {
		return 3;
	}

	return 4;
}

export function f(value: DigitsOf<4>): IntRange<0, 16> {
	return classify(value, 0) + classify(value, 1) + classify(value, 2) + classify(value, 3);
}`;

test("a helper too big to duplicate is left as a call in TypeScript and inlined in Python", () => {
	// The same program, the same pass, two answers, because the two targets pay for it in different
	// currencies: bytes downloaded on one side, interpreter frames on the other. That divergence is
	// the point of a per-target budget, so it is asserted directly.
	assert.match(generated(BIG_HELPER_MANY_CALLS, "utility.ts"), /\bclassify\(/u, "TypeScript duplicated a large helper");
	assert.doesNotMatch(
		generated(BIG_HELPER_MANY_CALLS, "utility.py", PYTHON_BACKEND),
		/\bclassify\(/u,
		"Python left a call it had the budget to inline",
	);
});

const STRAIGHT_LINE_HELPER = `function weigh(value: Digits, index: Int): IntRange<0, 90> {
	const digit = value.charCodeAt(index) - 48;
	const doubled = digit * 2;
	const shifted = doubled * 5;

	return shifted;
}

`;

test("a straight-line helper with one call site is absorbed, and the same helper shared is not", () => {
	const once = `${STRAIGHT_LINE_HELPER}export function f(value: DigitsOf<4>): IntRange<0, 90> {
	return weigh(value, 0);
}`;
	const text = generated(once, "utility.ts");
	assert.doesNotMatch(text, /\bweigh\(/u, "the only call site was not absorbed");
	assert.doesNotMatch(text, /function weigh/u, "the absorbed helper was still emitted");

	// The same helper, called twice, is a copy the budget will not pay for — the difference is the
	// call count, not the helper. Both calls pass the same index on purpose: a different constant
	// would specialize into a second function (ADR 0004), each with a call site of its own, and
	// then there would be nothing shared to refuse.
	const twice = `${STRAIGHT_LINE_HELPER}export function f(left: DigitsOf<4>, right: DigitsOf<4>): IntRange<0, 180> {
	return weigh(left, 0) + weigh(right, 0);
}`;
	assert.match(generated(twice, "utility.ts"), /\bweigh\(/u, "a duplicated helper was inlined anyway");
});

test("a budget of zero duplicated nodes still absorbs a sole call site", () => {
	const program = compileSource({ "utility.ts": SMALL_HELPER_MANY_CALLS }).program;
	const unchanged = inlineCalls(program, { maxStatements: 8, maxDuplicatedNodes: 0 });
	// Four call sites, so no copy pays for itself and the helper stays.
	assert.match(dumpProgram(unchanged), /utility::digitAt/u);
});
