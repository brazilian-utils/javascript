/**
 * The engine is generic.
 *
 * `examples/generic` is a project with no relation to the one that motivated the engine: it is
 * compiled by the same compiler, with the same standard library, and generates the same three
 * targets. This test is what keeps a Brazilian Utils assumption from leaking into the compiler.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { compileProject } from "../src/api.ts";
import { generate } from "../src/backend/generate.ts";
import { Interpreter } from "../src/interp/interp.ts";
import { TYPESCRIPT_BACKEND } from "../src/targets/typescript/index.ts";
import { PYTHON_BACKEND } from "../src/targets/python/index.ts";
import { GO_BACKEND } from "../src/targets/go/index.ts";

const EXAMPLE = join(import.meta.dirname, "..", "examples", "generic", "source");

test("a project with no Brazilian anything compiles and runs", () => {
	const compilation = compileProject(EXAMPLE);
	const interpreter = new Interpreter(compilation.program);

	for (const [value, expected] of [
		["4539578763621486", true],
		["4539578763621487", false],
		["79927398713", true],
		["79927398710", false],
		["", false],
		["1", false],
		["abc", false],
	] as const) {
		assert.equal(interpreter.call("is-valid-luhn::isValidLuhn", [value]), expected, value);
	}

	for (const [value, expected] of [
		["Hello, World!", "hello-world"],
		["  spaced  out  ", "spaced-out"],
		["ALREADY-slug-99", "already-slug-99"],
		["", ""],
	] as const) {
		assert.equal(interpreter.call("slugify::slugify", [value]), expected, value);
	}
});

test("the example generates for every target", () => {
	const compilation = compileProject(EXAMPLE);
	for (const backend of [TYPESCRIPT_BACKEND, PYTHON_BACKEND, GO_BACKEND]) {
		const result = generate(compilation.program, backend);
		assert.ok(result.files.length > 0, `${backend.spec.name} generated nothing`);
		for (const file of result.files) {
			// A Python package marker is deliberately empty; everything else has content.
			if (file.path.endsWith("__init__.py")) continue;
			assert.ok(file.text.length > 0, `${file.path} is empty`);
		}
	}
});
