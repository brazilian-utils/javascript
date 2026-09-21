/**
 * Compiles every module under `source/` into every target under `compiler/targets/`.
 *
 * Usage: `node compiler/cli.ts [target...]`
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";

import { compileModule } from "./frontend.ts";
import { type Module } from "./ir.ts";
import { emit as emitCsharp } from "./targets/csharp.ts";
import { emit as emitGo } from "./targets/go.ts";
import { emit as emitJava } from "./targets/java.ts";
import { emit as emitPython } from "./targets/python.ts";
import { emit as emitRuby } from "./targets/ruby.ts";
import { emit as emitRust } from "./targets/rust.ts";
import { emit as emitTypeScript } from "./targets/typescript.ts";

const root = resolve(import.meta.dirname, "..");

/** The files whose blank lines are content rather than layout. */
const VERBATIM = new Set([".json", ".toml", ".mod"]);

/**
 * Closes the gaps pruning leaves behind.
 *
 * An emitter joins its sections with a blank line between them, so a module that reaches none
 * of the constants, or none of the errors, ends up with a run of empty lines where they would
 * have been. Every target spells a string literal with escapes rather than a real newline, so
 * a run of three or more newlines in an emitted file is always layout and never content.
 *
 * @param {string} path - The file being written, whose extension says whether to leave it be.
 * @param {string} contents - What the emitter produced.
 * @returns {string} The same file with at most one blank line in a row.
 */
const tidy = (path: string, contents: string): string => {
	if (VERBATIM.has(extname(path))) return contents;

	return `${contents.replaceAll(/\n{3,}/g, "\n\n").trimEnd()}\n`;
};

const targets: Record<string, (module: Module, modules: Module[]) => Record<string, string>> = {
	typescript: emitTypeScript,
	python: emitPython,
	go: emitGo,
	rust: emitRust,
	ruby: emitRuby,
	java: emitJava,
	csharp: emitCsharp,
};

const requested = process.argv.slice(2);
const selected = requested.length > 0 ? requested : Object.keys(targets);
// `_std.ts` is the portable standard library: every target implements it natively, so it is
// documentation and a reference implementation rather than a module to compile.
const sources = readdirSync(resolve(root, "source")).filter(
	(name) => name.endsWith(".ts") && !name.startsWith("_"),
);
const modules = sources.map((name) => compileModule(resolve(root, "source", name)));

for (const target of selected) {
	const emit = targets[target];

	if (emit === undefined) throw new Error(`unknown target: ${target}`);

	const outDir = resolve(root, "out", target);

	rmSync(outDir, { recursive: true, force: true });

	let count = 0;

	for (const module of modules) {
		for (const [path, contents] of Object.entries(emit(module, modules))) {
			const full = resolve(outDir, path);

			mkdirSync(dirname(full), { recursive: true });
			writeFileSync(full, tidy(full, contents));
			count++;
		}
	}

	console.log(`${target.padEnd(11)} ${count} files from ${modules.length} module(s)`);
}
