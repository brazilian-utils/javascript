/**
 * The import boundaries the architecture depends on.
 *
 * Nothing after the HIR may know about the parser, and nothing before the backends may know about
 * a target. Both are checked by reading the sources rather than by convention, because a violation
 * is exactly the kind of thing that creeps in one import at a time.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(import.meta.dirname, "..", "src");

function sourceFiles(root: string): string[] {
	const files: string[] = [];
	const walk = (directory: string): void => {
		for (const entry of readdirSync(directory)) {
			const full = join(directory, entry);
			if (statSync(full).isDirectory()) walk(full);
			else if (entry.endsWith(".ts")) files.push(full);
		}
	};
	walk(root);
	return files;
}

const FRONTEND_ONLY = ["src/frontend/lower.ts"];

test("only the frontend imports the parser", () => {
	for (const file of sourceFiles(SRC)) {
		const relativePath = relative(join(SRC, ".."), file).split("\\").join("/");
		if (FRONTEND_ONLY.includes(relativePath)) continue;
		const source = readFileSync(file, "utf8");
		assert.ok(
			!source.includes('from "oxc-parser"'),
			`${relativePath} imports the parser; only the frontend may`,
		);
	}
});

const TARGET_FREE_DIRECTORIES = [
	"frontend",
	"hir",
	"core",
	"link",
	"comptime",
	"analysis",
	"optimize",
	"interp",
	"intrinsics",
];

test("nothing before the backends imports a target", () => {
	for (const directory of TARGET_FREE_DIRECTORIES) {
		for (const file of sourceFiles(join(SRC, directory))) {
			const source = readFileSync(file, "utf8");
			assert.ok(
				!source.includes("targets/"),
				`${relative(SRC, file)} imports a target; lowering decisions belong in a backend`,
			);
		}
	}
});

test("nothing before the backends branches on a target name", () => {
	const names = ["typescript", "python", "golang"];
	for (const directory of TARGET_FREE_DIRECTORIES) {
		for (const file of sourceFiles(join(SRC, directory))) {
			const source = readFileSync(file, "utf8").toLowerCase();
			for (const name of names) {
				assert.ok(
					!source.includes(`=== "${name}"`),
					`${relative(SRC, file)} branches on the ${name} target`,
				);
			}
		}
	}
});

test("the standard library only uses the source subset", () => {
	const stdlib = join(import.meta.dirname, "..", "stdlib");
	for (const file of sourceFiles(stdlib)) {
		const source = readFileSync(file, "utf8");
		assert.ok(!source.includes("import "), `${relative(stdlib, file)} imports; the standard library is self-contained`);
	}
});
