#!/usr/bin/env node
/**
 * Combined cross-language benchmark runner.
 *
 * Spawns one subprocess per language. Each subprocess runs entirely in its own language runtime
 * (node for TypeScript, python3 for Python, `go run` for Go) and times itself internally -- this
 * script never times a call across a process boundary, since that would measure the boundary
 * instead of the code. Every harness prints its own human-readable progress and table to stdout,
 * plus one trailing line starting with `BENCH_JSON ` carrying a machine-readable summary; this
 * script parses only that line and folds every language's rows into one table.
 *
 * Usage: node core/bench/run.mjs
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BENCH_DIR = dirname(fileURLToPath(import.meta.url));
const CORE_DIR = join(BENCH_DIR, "..");

// The handwritten ports are separate repositories, checked out beside this one by default.
// `BRUTILS_ROOT` overrides that for a checkout that lives somewhere else.
const PORTS_ROOT = process.env["BRUTILS_ROOT"] ?? join(CORE_DIR, "..", "..", "brazilian-utils");
const PYTHON_BRUTILS = join(PORTS_ROOT, "python", "brutils");
const GO_BRUTILS = join(PORTS_ROOT, "go");
const RUST_BRUTILS = join(PORTS_ROOT, "rust");
const RUST_HARNESS = join(BENCH_DIR, "rust");

function section(title) {
	console.log(`\n=== ${title} ===\n`);
}

function runLanguage(name, { precondition, run }) {
	section(name);
	if (precondition) {
		const problem = precondition();
		if (problem) {
			console.log(problem);
			return { language: name.toLowerCase(), status: "skipped", reason: problem };
		}
	}

	const result = run();
	process.stdout.write(result.stdout ?? "");
	if (result.stderr) process.stderr.write(result.stderr);

	if (result.status !== 0 && result.status !== null) {
		return {
			language: name.toLowerCase(),
			status: "error",
			reason: `subprocess exited with code ${result.status}`,
		};
	}

	const jsonLine = (result.stdout ?? "")
		.split("\n")
		.reverse()
		.find((line) => line.startsWith("BENCH_JSON "));
	if (!jsonLine) {
		return { language: name.toLowerCase(), status: "error", reason: "no BENCH_JSON line in output" };
	}

	try {
		const parsed = JSON.parse(jsonLine.slice("BENCH_JSON ".length));
		return { status: "ok", ...parsed };
	} catch (error) {
		return { language: name.toLowerCase(), status: "error", reason: `could not parse BENCH_JSON: ${error.message}` };
	}
}

const results = [];

results.push(
	runLanguage("TypeScript", {
		run: () =>
			spawnSync(
				"node",
				["--import", "./conformance/sloppy-imports.mjs", "./bench/typescript.ts"],
				{ cwd: CORE_DIR, encoding: "utf8" },
			),
	}),
);

results.push(
	runLanguage("Python", {
		precondition: () => {
			if (!existsSync(PYTHON_BRUTILS)) {
				return (
					`Missing handwritten Python port at ${PYTHON_BRUTILS}\n` +
					"Clone it first:\n" +
					"  git clone https://github.com/brazilian-utils/python /home/user/brazilian-utils/python"
				);
			}
			return null;
		},
		run: () => spawnSync("python3", [join(BENCH_DIR, "python.py")], { encoding: "utf8" }),
	}),
);

results.push(
	runLanguage("Go", {
		precondition: () => {
			if (!existsSync(GO_BRUTILS)) {
				return (
					`Missing handwritten Go port at ${GO_BRUTILS}\n` +
					"Clone it first:\n" +
					"  git clone https://github.com/brazilian-utils/go /home/user/brazilian-utils/go"
				);
			}
			return null;
		},
		run: () => {
			const goDir = join(BENCH_DIR, "go");
			// `go.mod` cannot read an environment variable, and its committed `replace` is a path
			// relative to itself, which is right for the default layout. Honour `BRUTILS_ROOT` by
			// rewriting the directive for the run and restoring it afterwards, so a checkout
			// somewhere else does not leave the file modified.
			const DEFAULT_REPLACE = "../../../../brazilian-utils/go";
			const custom = process.env["BRUTILS_ROOT"] !== undefined;
			const edit = (target) =>
				spawnSync("go", ["mod", "edit", `-replace=github.com/brazilian-utils/go=${target}`], { cwd: goDir });
			if (custom) edit(GO_BRUTILS);
			try {
				return spawnSync("go", ["run", "."], { cwd: goDir, encoding: "utf8" });
			} finally {
				if (custom) edit(DEFAULT_REPLACE);
			}
		},
	}),
);

// Rust drops in later, from another agent's work in core/out/rust/. This runner does not wait for
// it and does not write it -- it just notices when both the harness and the generated code exist,
// and otherwise reports why the row is absent instead of silently omitting Rust from the table.
results.push(
	runLanguage("Rust", {
		precondition: () => {
			if (!existsSync(RUST_BRUTILS)) {
				return (
					`Missing handwritten Rust port at ${RUST_BRUTILS}\n` +
					"Clone it first:\n" +
					"  git clone https://github.com/BrazilianUtils/rust /home/user/brazilian-utils/rust"
				);
			}
			if (!existsSync(join(CORE_DIR, "out", "rust"))) {
				return "core/out/rust/ does not exist yet -- the Rust target has not been generated.";
			}
			if (!existsSync(RUST_HARNESS)) {
				return "core/bench/rust/ has not been written yet -- no Rust harness to run.";
			}
			return null;
		},
		run: () => spawnSync("cargo", ["run", "--release"], { cwd: RUST_HARNESS, encoding: "utf8" }),
	}),
);

section("Combined result");

const toolchainLines = [];
for (const result of results) {
	if (result.status === "ok" && result.toolchain) {
		for (const [tool, version] of Object.entries(result.toolchain)) {
			toolchainLines.push(`- ${tool}: ${version}`);
		}
	}
}
console.log("Toolchain versions this run was measured with:");
console.log(toolchainLines.join("\n") || "(none recorded)");

console.log("\n| language | utility | variant | handwritten | generated | ratio (gen/hw) | budget |");
console.log("| --- | --- | --- | --- | --- | --- | --- |");

const BUDGET = 1.5;
let anyDisagreement = false;
let anySkipped = false;

for (const result of results) {
	if (result.status !== "ok") continue;
	for (const row of result.rows ?? []) {
		const ratio = row.generatedMs / row.handwrittenMs;
		const ok = ratio <= BUDGET;
		console.log(
			`| ${result.language} | \`${row.utility}\` | ${row.variant} | ${row.handwrittenMs.toFixed(1)} ms | ${row.generatedMs.toFixed(1)} ms | ${ratio.toFixed(2)}x | ${ok ? "within" : "OVER"} ${BUDGET}x |`,
		);
	}
	if ((result.disagreements ?? []).length > 0) anyDisagreement = true;
	if ((result.skipped ?? []).length > 0) anySkipped = true;
}

console.log("\nLanguages not in the table above:");
for (const result of results) {
	if (result.status === "skipped") console.log(`- ${result.language}: ${result.reason}`);
	if (result.status === "error") console.log(`- ${result.language}: ERROR -- ${result.reason}`);
}

if (anyDisagreement) {
	console.log("\nDISAGREEMENTS (generated vs. handwritten returned different answers -- see above per language):");
	for (const result of results) {
		for (const d of result.disagreements ?? []) {
			console.log(
				`- ${result.language} ${d.utility} (${d.variant}): input=${JSON.stringify(d.input)} handwritten=${JSON.stringify(d.handwritten)} generated=${JSON.stringify(d.generated)}`,
			);
		}
	}
} else {
	console.log("\nNo disagreements: every benchmarked input produced the same answer on both sides.");
}

if (anySkipped) {
	console.log("\nComparisons left out (contract mismatch -- see core/bench/README.md for the full reasoning):");
	for (const result of results) {
		for (const s of result.skipped ?? []) {
			console.log(`- ${result.language} ${s.utility}: ${s.reason}`);
		}
	}
}
