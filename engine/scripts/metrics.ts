#!/usr/bin/env node
/**
 * The metrics the architecture is judged by, computed rather than asserted.
 *
 * Usage: `node scripts/metrics.ts <project> [--json]`. Everything here is mechanical: the numbers
 * come from the compiler and from the generated files, so a claim in `progress.md` can always be
 * re-derived.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { compileProject } from "../src/api.ts";
import { generate } from "../src/backend/generate.ts";
import { GO_BACKEND } from "../src/targets/go/index.ts";
import { PYTHON_BACKEND } from "../src/targets/python/index.ts";
import { TYPESCRIPT_BACKEND } from "../src/targets/typescript/index.ts";
import { RUST_BACKEND } from "../src/targets/rust/index.ts";
import { typeToString } from "../src/types.ts";

const ENGINE = resolve(import.meta.dirname, "..");
const project = resolve(process.argv[2] ?? ".");

function linesOf(path: string): number {
	return readFileSync(path, "utf8").split("\n").filter((line) => line.trim() !== "").length;
}

function linesUnder(root: string, filter: (path: string) => boolean = () => true): number {
	let total = 0;
	const walk = (directory: string): void => {
		for (const entry of readdirSync(directory)) {
			const full = join(directory, entry);
			if (statSync(full).isDirectory()) walk(full);
			else if (filter(full)) total += linesOf(full);
		}
	};
	walk(root);
	return total;
}

const compilation = compileProject(join(project, "source"));
const backends = [TYPESCRIPT_BACKEND, PYTHON_BACKEND, GO_BACKEND, RUST_BACKEND];

const lowering: Record<string, Record<string, number>> = {};
const generatedLines: Record<string, number> = {};
const perUtility: Record<string, Record<string, number>> = {};

for (const backend of backends) {
	const result = generate(compilation.program, backend);
	const counts = { native: 0, library: 0, portable: 0 };
	const seen = new Set<string>();
	for (const selection of result.selections) {
		const key = `${selection.op}(${selection.args})`;
		if (seen.has(key)) continue;
		seen.add(key);
		counts[selection.impl as keyof typeof counts] += 1;
	}
	lowering[backend.spec.name] = counts;
	generatedLines[backend.spec.name] = result.files
		.filter((file) => !file.path.startsWith("_driver") && !file.path.includes("cmd/"))
		.reduce((total, file) => total + file.text.split("\n").filter((line) => line.trim() !== "").length, 0);

	for (const file of result.files) {
		const utility = file.path.replace(/\.[a-z]+$/, "");
		if (!compilation.program.entryPoints.some((name) => name.split("::")[0] === utility.replaceAll("_", "-"))) continue;
		perUtility[utility] = perUtility[utility] ?? {};
		perUtility[utility]![backend.spec.name] = file.text.split("\n").filter((line) => line.trim() !== "").length;
	}
}

const wideIntegers = new Set<string>();
for (const fn of compilation.program.functions.values()) {
	for (const param of fn.params) {
		const rendered = typeToString(param.type);
		if (param.type.kind === "Int" && (param.type.lo < -(2n ** 53n - 1n) || param.type.hi > 2n ** 53n - 1n)) {
			wideIntegers.add(`${fn.name}(${param.name}: ${rendered})`);
		}
	}
}

const metrics = {
	utilities: compilation.program.entryPoints.length,
	coreFunctions: compilation.program.functions.size,
	sourceLines: linesUnder(join(project, "source")) + linesUnder(join(ENGINE, "stdlib")),
	compilerLines: {
		frontend: linesUnder(join(ENGINE, "src", "frontend")) + linesUnder(join(ENGINE, "src", "hir")),
		core: linesUnder(join(ENGINE, "src", "core")),
		analysisAndPasses:
			linesUnder(join(ENGINE, "src", "analysis")) +
			linesUnder(join(ENGINE, "src", "optimize")) +
			linesUnder(join(ENGINE, "src", "link")) +
			linesUnder(join(ENGINE, "src", "comptime")),
		interpreter: linesUnder(join(ENGINE, "src", "interp")),
		intrinsics: linesUnder(join(ENGINE, "src", "intrinsics")),
		backendFramework: linesUnder(join(ENGINE, "src", "backend")),
		targets: Object.fromEntries(
			backends.map((backend) => [
				backend.spec.name,
				linesUnder(join(ENGINE, "src", "targets", backend.spec.name)),
			]),
		),
	},
	lowering,
	generatedLines,
	perUtility,
	wideIntegers: [...wideIntegers],
	widenedLoops: compilation.metrics.widenedLoops,
	clampedRanges: compilation.metrics.clampedRanges.length,
};

if (process.argv.includes("--json")) {
	process.stdout.write(`${JSON.stringify(metrics, null, "\t")}\n`);
} else {
	const targetLines = Object.values(metrics.compilerLines.targets).reduce((a, b) => a + b, 0);
	const frontendCoreAnalysis =
		metrics.compilerLines.frontend + metrics.compilerLines.core + metrics.compilerLines.analysisAndPasses;
	process.stdout.write(
		[
			`utilities:            ${metrics.utilities}`,
			`core functions:       ${metrics.coreFunctions}`,
			`source lines:         ${metrics.sourceLines}`,
			`frontend+core+analysis: ${frontendCoreAnalysis}`,
			`backends (4 targets): ${targetLines}`,
			`generated lines:      ${Object.entries(metrics.generatedLines).map(([name, count]) => `${name} ${count}`).join(", ")}`,
			`lowering mix:         ${Object.entries(lowering).map(([name, counts]) => `${name} ${counts["native"]}n/${counts["library"]}l/${counts["portable"]}p`).join(", ")}`,
			`wide integers:        ${metrics.wideIntegers.length}`,
			`widened loops:        ${metrics.widenedLoops}`,
			`clamped ranges:       ${metrics.clampedRanges}`,
			`relative path:        ${relative(ENGINE, project)}`,
		].join("\n") + "\n",
	);
}
