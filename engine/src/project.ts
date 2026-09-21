/**
 * Project loading: the engine is generic, so everything project-specific lives in a config file
 * next to the sources. Nothing in the compiler knows what a project's utilities are about.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Diagnostics } from "./diagnostics.ts";
import { parseModule } from "./frontend/lower.ts";
import type { HModule } from "./hir/ast.ts";

export type TargetName = "typescript" | "python" | "go";

export type ProjectConfig = {
	/** Human readable name, used in generated file headers. */
	readonly name: string;
	/** Directory holding the source-language modules, relative to the config file. */
	readonly sourceRoot: string;
	/** Where generated code goes, relative to the config file. */
	readonly out: string;
	readonly targets: readonly TargetName[];
	/** Package or module prefix each target uses for the generated core. */
	readonly packages?: Readonly<Partial<Record<TargetName, string>>>;
};

export const DEFAULT_CONFIG: ProjectConfig = {
	name: "project",
	sourceRoot: "source",
	out: "out",
	targets: ["typescript", "python", "go"],
};

export function loadConfig(path: string): { config: ProjectConfig; root: string } {
	const file = resolve(path);
	const raw = JSON.parse(readFileSync(file, "utf8")) as Partial<ProjectConfig>;
	return {
		config: { ...DEFAULT_CONFIG, ...raw },
		root: resolve(file, ".."),
	};
}

export function sourceFiles(root: string): string[] {
	const files: string[] = [];
	const walk = (directory: string): void => {
		for (const entry of readdirSync(directory).sort()) {
			const full = join(directory, entry);
			if (statSync(full).isDirectory()) {
				walk(full);
				continue;
			}
			if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) files.push(full);
		}
	};
	walk(root);
	return files;
}

/**
 * The engine's own source-language standard library.
 *
 * Portable lowerings call these, so a target is complete as soon as its core constructs lower:
 * a native lowering is an optimization, never a requirement. They are compiled like any other
 * module and pruned when nothing uses them.
 */
export const STDLIB_ROOT = fileURLToPath(new URL("../stdlib", import.meta.url));

/** Parses every module of a project, plus the engine's standard library, into HIR. */
export function loadModules(sourceRoot: string, diagnostics: Diagnostics): HModule[] {
	const modules: HModule[] = [];
	for (const file of sourceFiles(STDLIB_ROOT)) {
		const source = readFileSync(file, "utf8");
		const name = relative(STDLIB_ROOT, file).replace(/\.ts$/, "").split("\\").join("/");
		modules.push(parseModule(file, `std/${name}`, source, diagnostics));
	}
	for (const file of sourceFiles(sourceRoot)) {
		const source = readFileSync(file, "utf8");
		const path = relative(sourceRoot, file).replace(/\.ts$/, "").split("\\").join("/");
		modules.push(parseModule(file, path, source, diagnostics));
	}
	return modules;
}
