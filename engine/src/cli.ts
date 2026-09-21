#!/usr/bin/env node
/**
 * The engine's command line.
 *
 *   logic-engine check   [--project <dir>]
 *   logic-engine dump    [--project <dir>] [--stage hir|core]
 *   logic-engine build   [--project <dir>] [--target <name>] [--no-idioms] [--out <dir>]
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CompileError, compileProject, dumpProgram, renderDiagnostic } from "./api.ts";
import { dumpHir } from "./hir/ast.ts";
import { generate, writeFiles } from "./backend/generate.ts";
import { formatOutput } from "./backend/format.ts";
import { loadConfig } from "./project.ts";
import type { TargetName } from "./project.ts";
import { TYPESCRIPT_BACKEND } from "./targets/typescript/index.ts";
import { PYTHON_BACKEND } from "./targets/python/index.ts";
import { GO_BACKEND } from "./targets/go/index.ts";

const BACKENDS = {
	typescript: TYPESCRIPT_BACKEND,
	python: PYTHON_BACKEND,
	go: GO_BACKEND,
};

function flag(name: string, fallback?: string): string | undefined {
	const index = process.argv.indexOf(`--${name}`);
	return index === -1 ? fallback : process.argv[index + 1];
}

function has(name: string): boolean {
	return process.argv.includes(`--${name}`);
}

function main(): void {
	const command = process.argv[2] ?? "build";
	const projectDir = resolve(flag("project", ".")!);
	const { config, root } = loadConfig(resolve(projectDir, "engine.config.json"));
	const sourceRoot = resolve(root, config.sourceRoot);

	try {
		const compilation = compileProject(sourceRoot, { noOptimize: has("no-optimize") });

		if (command === "check") {
			process.stdout.write(`ok: ${compilation.program.functions.size} functions, ${compilation.program.entryPoints.length} utilities\n`);
			return;
		}

		if (command === "dump") {
			if (flag("stage", "core") === "hir") {
				for (const module of compilation.modules) process.stdout.write(`${dumpHir(module)}\n`);
			} else {
				process.stdout.write(`${dumpProgram(compilation.program)}\n`);
			}
			return;
		}

		if (command !== "build") {
			process.stderr.write(`unknown command ${command}\n`);
			process.exitCode = 1;
			return;
		}

		const targets = (flag("target") === undefined ? config.targets : [flag("target") as TargetName]).filter(
			(name): name is TargetName => name in BACKENDS,
		);
		const outRoot = resolve(root, flag("out", config.out)!);
		const noIdioms = has("no-idioms");

		for (const target of targets) {
			const backend = BACKENDS[target];
			const result = generate(compilation.program, backend, { noIdioms });
			const outDir = resolve(outRoot, noIdioms ? `${target}-plain` : target);
			writeFiles(outDir, result, {
				"LOWERING.md": result.lowering,
				"API.json": `${JSON.stringify(result.api, null, "\t")}\n`,
				"SOURCEMAP.json": `${JSON.stringify(result.sourceMap, null, "\t")}\n`,
			});
			const formatted = has("no-format") ? { applied: [], missing: [] } : formatOutput(target, outDir);
			process.stdout.write(
				`${target}: ${result.files.length} files -> ${outDir}${formatted.applied.length === 0 ? "" : ` (${formatted.applied.join(", ")})`}\n`,
			);
			// Unformatted output is still correct, but it is not the bytes the committed output
			// holds, so say which tool is missing rather than leave a diff to explain it.
			if (formatted.missing.length > 0) {
				process.stderr.write(`warning: ${target} left unformatted, not installed: ${formatted.missing.join(", ")}\n`);
			}
		}
	} catch (error) {
		if (error instanceof CompileError) {
			for (const diagnostic of error.diagnostics) {
				let source: string | undefined;
				try {
					source = readFileSync(diagnostic.span.file, "utf8");
				} catch {
					source = undefined;
				}
				process.stderr.write(`${renderDiagnostic(diagnostic, source)}\n\n`);
			}
			process.exitCode = 1;
			return;
		}
		throw error;
	}
}

main();
