/** Shared helpers for the engine's own tests: compile a source snippet in a temp project. */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CompileError } from "../src/diagnostics.ts";
import type { Diagnostic } from "../src/diagnostics.ts";
import { compileProject } from "../src/api.ts";
import type { Compilation } from "../src/api.ts";

export function withProject<T>(files: Record<string, string>, run: (root: string) => T): T {
	const root = mkdtempSync(join(tmpdir(), "logic-engine-"));
	try {
		for (const [path, source] of Object.entries(files)) {
			const full = join(root, path);
			mkdirSync(join(full, ".."), { recursive: true });
			writeFileSync(full, source);
		}
		return run(root);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

export function compileSource(files: Record<string, string>): Compilation {
	return withProject(files, (root) => compileProject(root));
}

/** Compiles a snippet expected to fail, and returns the diagnostics. */
export function diagnosticsOf(files: Record<string, string>): readonly Diagnostic[] {
	try {
		compileSource(files);
	} catch (error) {
		if (error instanceof CompileError) return error.diagnostics;
		throw error;
	}
	return [];
}

export function codesOf(files: Record<string, string>): string[] {
	return diagnosticsOf(files).map((diagnostic) => diagnostic.code);
}
