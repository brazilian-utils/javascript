/**
 * Translation validation.
 *
 * Every Core pass has to preserve meaning, so the reference interpreter runs the Core before and
 * after the pass over generated inputs and the results must be identical. This is what makes it
 * safe for the optimizer to raise a loop into a fold, or to fold a constant away.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { checkProgram } from "../src/core/check.ts";
import { Diagnostics } from "../src/diagnostics.ts";
import { Interpreter } from "../src/interp/interp.ts";
import { link } from "../src/link/link.ts";
import { optimize } from "../src/optimize/optimize.ts";
import { threadCapabilities } from "../src/analysis/capabilities.ts";
import { loadModules } from "../src/project.ts";
import type { Value } from "../src/values.ts";
import { valuesEqual } from "../src/values.ts";
import { withProject } from "./helpers.ts";

const SUM = `export function sumDigits(value: Digits): Int {
	let total: Int = 0;

	for (const point of str.codePoints(value)) {
		total = total + (point - 48);
	}

	return total;
}`;

const MAPPED = `export function doubled(values: List<IntRange<0, 100>>): List<Int> {
	return seq.map(values, (item: IntRange<0, 100>): Int => item * 2);
}`;

function programsOf(source: string) {
	return withProject({ "utility.ts": source }, (root) => {
		const diagnostics = new Diagnostics();
		const modules = loadModules(root, diagnostics);
		const { program } = checkProgram(modules, diagnostics);
		diagnostics.throwIfErrors();
		const threaded = threadCapabilities(program);
		return { before: link(threaded), after: link(optimize(threaded)) };
	});
}

function sameOnInputs(source: string, fn: string, inputs: readonly Value[][]): void {
	const { before, after } = programsOf(source);
	for (const args of inputs) {
		const left = new Interpreter(before).call(fn, args);
		const right = new Interpreter(after).call(fn, args);
		assert.ok(
			valuesEqual(left, right),
			`optimizing changed the result of ${fn}(${JSON.stringify(args.map(String))})`,
		);
	}
}

test("a raised loop and the original agree on generated inputs", () => {
	const inputs: Value[][] = ["", "0", "12345", "99999999", "0123456789"].map((value) => [value]);
	sameOnInputs(SUM, "utility::sumDigits", inputs);
});

test("constant folding and dead code elimination preserve meaning", () => {
	const inputs: Value[][] = [[[]], [[1n, 2n, 3n]], [[0n, 100n]]];
	sameOnInputs(MAPPED, "utility::doubled", inputs);
});
