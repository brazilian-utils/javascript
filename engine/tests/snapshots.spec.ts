/**
 * Stage snapshots.
 *
 * Every stage has a readable dump, and the dumps are committed: a change in the HIR, in the
 * annotated Core or in the generated TypeScript shows up as a reviewable diff rather than as a
 * surprise in a target. Refresh them with `UPDATE_SNAPSHOTS=1 npm test`.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compileProject, dumpHir, dumpProgram } from "../src/api.ts";
import { generate } from "../src/backend/generate.ts";
import { TYPESCRIPT_BACKEND } from "../src/targets/typescript/index.ts";

const EXAMPLE = join(import.meta.dirname, "..", "examples", "generic", "source");
const FIXTURES = join(import.meta.dirname, "fixtures");

function snapshot(name: string, actual: string): void {
	const path = join(FIXTURES, name);
	mkdirSync(FIXTURES, { recursive: true });
	if (process.env["UPDATE_SNAPSHOTS"] === "1" || !existsSync(path)) {
		writeFileSync(path, actual);
		return;
	}
	assert.equal(actual, readFileSync(path, "utf8"), `${name} changed; review the diff and refresh if intended`);
}

test("the HIR dump is stable", () => {
	const compilation = compileProject(EXAMPLE);
	const dumps = compilation.modules
		.filter((module) => !module.path.startsWith("std/"))
		.map((module) => dumpHir(module))
		.join("\n\n");
	snapshot("example.hir.txt", `${dumps}\n`);
});

test("the annotated Core dump is stable", () => {
	snapshot("example.core.txt", `${dumpProgram(compileProject(EXAMPLE).program)}\n`);
});

test("the generated TypeScript is stable", () => {
	const result = generate(compileProject(EXAMPLE).program, TYPESCRIPT_BACKEND);
	for (const file of result.files) {
		snapshot(`example.${file.path.replaceAll("/", "_")}.txt`, file.text);
	}
	snapshot("example.LOWERING.md", result.lowering);
});
