/**
 * Output has to be byte-identical across runs: a golden file that changes because a Map iterated
 * differently is a golden file nobody trusts.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { compileProject } from "../src/api.ts";
import { generate } from "../src/backend/generate.ts";
import { GO_BACKEND } from "../src/targets/go/index.ts";
import { PYTHON_BACKEND } from "../src/targets/python/index.ts";
import { TYPESCRIPT_BACKEND } from "../src/targets/typescript/index.ts";
import { RUST_BACKEND } from "../src/targets/rust/index.ts";

const EXAMPLE = join(import.meta.dirname, "..", "examples", "generic", "source");

test("generating twice produces identical bytes", () => {
	for (const backend of [TYPESCRIPT_BACKEND, PYTHON_BACKEND, GO_BACKEND, RUST_BACKEND]) {
		const first = generate(compileProject(EXAMPLE).program, backend);
		const second = generate(compileProject(EXAMPLE).program, backend);
		assert.deepEqual(
			first.files.map((file) => [file.path, file.text]),
			second.files.map((file) => [file.path, file.text]),
			`${backend.spec.name} is not deterministic`,
		);
		assert.equal(first.lowering, second.lowering, `${backend.spec.name} LOWERING.md is not deterministic`);
	}
});

test("the idiomatic and the plain form generate the same module set", () => {
	const compilation = compileProject(EXAMPLE);
	const idiomatic = generate(compilation.program, TYPESCRIPT_BACKEND);
	const plain = generate(compilation.program, TYPESCRIPT_BACKEND, { noIdioms: true });
	assert.deepEqual(
		idiomatic.files.map((file) => file.path).sort(),
		plain.files.map((file) => file.path).sort(),
	);
});
