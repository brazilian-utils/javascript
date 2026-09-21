/**
 * The Rust target's regex lowering, checked against `RegExp` through the actual compiled crate.
 *
 * `regex.spec.ts` checks the frontend's own reference matcher (`regexMatches`) against `RegExp`;
 * this file checks a different, later link in the same chain: that the Rust code the engine
 * generates for `re.test` -- a dedicated scanner for a "chain" pattern, a backtracking matcher for
 * everything else (see `engine/src/targets/rust/index.ts`'s "Regex" section) -- decides the same
 * thing `RegExp` does, for patterns exercising both paths and the boundary between them. Nothing
 * in `core/source` needs the fallback path today, so nothing else in this repository compiles and
 * runs it; this is the one place that does.
 *
 * It builds a small synthetic project (not committed, in the OS temp directory), generates the
 * Rust target for it, and runs the generated differential driver -- the same JSON-lines-over-
 * stdin protocol `core/conformance/run.ts` uses -- so this is an end-to-end check of the compiled
 * binary, not a check of the TypeScript generator's output as text.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { compileProject } from "../src/api.ts";
import { generate } from "../src/backend/generate.ts";
import { RUST_BACKEND } from "../src/targets/rust/index.ts";
import { runTarget } from "../src/conformance/differential.ts";
import type { Case } from "../src/conformance/differential.ts";

/**
 * One pattern under test: a source-language regex literal, the exported function name given to
 * it, and the inputs to check it against `RegExp` on. `shape` is not read by the test itself --
 * it documents, next to each pattern, which of `chainElementsOf`'s branches is expected to take
 * it, so a future reader can tell a real regression from a classifier that just got pickier.
 */
type PatternCase = {
	readonly fn: string;
	readonly pattern: string;
	readonly shape: "scanner" | "fallback";
	readonly inputs: readonly string[];
};

const CASES: readonly PatternCase[] = [
	{
		fn: "cpfLike",
		pattern: "/^[0-9]{3}[ .\\-/]*[0-9]{2}$/",
		shape: "scanner", // fixed digits, then a separator run disjoint from digits, alternating.
		inputs: ["123.45", "12345", "123..45", "12a45", "1234", "", "123 45", "123-45", "12345 ", "abc"],
	},
	{
		fn: "varTail",
		pattern: "/^[0-9]{2}[a-z]*$/",
		shape: "scanner", // the variable run is last: nothing after it to disagree with.
		inputs: ["12", "12abc", "1", "12ABC", "123abc", "ab12", "99z"],
	},
	{
		fn: "adjacentVarVar",
		pattern: "/^a*b+c?$/",
		// Two variable-length runs back to back: `chainElementsOf` requires a fixed run between any
		// two variable ones (see its comment), so this always falls back, even though `a`/`b`/`c`
		// happen to be disjoint here and a smarter scanner could in principle take it.
		shape: "fallback",
		inputs: ["", "a", "b", "ab", "aabbb", "aabbbc", "abc", "aabbc", "c", "bc", "aabbbcc", "abcabc"],
	},
	{
		fn: "altGroup",
		pattern: "/^(?:abc|de)+$/",
		shape: "fallback", // alternation.
		inputs: ["abc", "de", "abcde", "deabc", "abcabc", "dede", "ab", "abcd", "", "abcdeabc"],
	},
	{
		fn: "overlapBacktrack",
		pattern: "/^[a-z]*[a-c]{2}$/",
		// The variable run's class (`a`-`z`) is not disjoint from what follows it (`a`-`c`), so the
		// maximal-munch argument does not hold: a real match can need the `*` to give back
		// characters it greedily took ("aaac" only matches by backing off to "aa" + "ac"). This is
		// the case a wrong scanner would get wrong, which is exactly why `chainElementsOf` refuses
		// it rather than emitting one.
		shape: "fallback",
		inputs: ["aaac", "aac", "ac", "aaaac", "zzac", "zzzzac", "aa", "a", "", "abac", "zzzzzz", "aaa"],
	},
	{
		fn: "repeatedGroup",
		pattern: "/^(?:ab){2,3}$/",
		shape: "fallback", // a repeated group, not a repeated single class.
		inputs: ["abab", "ababab", "ab", "abababab", "aba", "", "abx"],
	},
	{
		fn: "singleClass",
		pattern: "/^[0-9]$/",
		shape: "scanner", // a bare class, no `Seq` wrapper at all.
		inputs: ["5", "55", "", "a"],
	},
	{
		fn: "emptyPattern",
		pattern: "/^$/",
		shape: "scanner", // the empty chain: matches only the empty string.
		inputs: ["", "a", " "],
	},
	{
		fn: "boundedVar",
		pattern: "/^[0-9]{2,4}$/",
		shape: "scanner", // variable but last, and its bound is finite rather than unbounded.
		inputs: ["12", "123", "1234", "1", "12345", ""],
	},
	{
		fn: "twoFixedAdjacent",
		pattern: "/^[0-9]{2}[a-z]{3}$/",
		shape: "scanner", // two fixed-count runs back to back: no ambiguity to check for.
		inputs: ["12abc", "12ab", "123abc", "12abcd", "12ABC"],
	},
];

function buildProject(): string {
	const root = mkdtempSync(join(tmpdir(), "engine-rust-regex-"));
	const source = join(root, "source");
	mkdirSync(source, { recursive: true });
	const lines = CASES.flatMap((entry) => [
		`const ${entry.fn.toUpperCase()} = ${entry.pattern};`,
		`export function ${entry.fn}(value: string): boolean {`,
		`\treturn re.test(${entry.fn.toUpperCase()}, value);`,
		"}",
		"",
	]);
	writeFileSync(join(source, "regex-cases.ts"), lines.join("\n"));
	return root;
}

test("the compiled Rust driver agrees with RegExp on every case, scanner and fallback alike", () => {
	const root = buildProject();
	try {
		const compilation = compileProject(join(root, "source"));
		const result = generate(compilation.program, RUST_BACKEND);

		const outDir = join(root, "out");
		for (const file of result.files) {
			const path = join(outDir, file.path);
			mkdirSync(dirname(path), { recursive: true });
			writeFileSync(path, file.text);
		}

		// Confirms the classifier put each pattern where this file says it should have, before
		// trusting the compiled answers below -- a pattern silently changing shape is exactly the
		// kind of regression `docs/targets/rust.md`'s rule is supposed to make visible.
		const supportText = result.files.find((file) => file.path === "src/support.rs")?.text ?? "";
		const moduleText = result.files.find((file) => file.path === "src/regex_cases.rs")?.text ?? "";
		for (const entry of CASES) {
			const called = moduleText.includes(`re_match_`) && moduleTextCalls(moduleText, entry.fn);
			assert.equal(
				called,
				entry.shape === "scanner",
				`${entry.fn} (${entry.pattern}) expected a ${entry.shape} lowering`,
			);
		}
		if (CASES.some((entry) => entry.shape === "fallback")) {
			assert.ok(supportText.includes("fn re_test("), "a fallback pattern exists but re_test was not emitted");
		}

		const cases: Case[] = CASES.flatMap((entry) =>
			entry.inputs.map((input) => ({ fn: `regex-cases::${entry.fn}`, args: [input] })),
		);
		const outcomes = runTarget(
			{
				name: "rust",
				command: "cargo",
				args: ["run", "--offline", "--quiet", "--bin", "driver"],
				cwd: outDir,
			},
			cases,
		);

		let index = 0;
		for (const entry of CASES) {
			const native = new RegExp(entry.pattern.slice(1, entry.pattern.lastIndexOf("/")), "u");
			for (const input of entry.inputs) {
				const outcome = outcomes[index]!;
				assert.ok(outcome.ok, `${entry.fn}(${JSON.stringify(input)}) failed: ${JSON.stringify(outcome)}`);
				assert.equal(
					(outcome as { ok: true; value: unknown }).value,
					native.test(input),
					`${entry.fn} (${entry.pattern}) disagreed with RegExp on ${JSON.stringify(input)}`,
				);
				index++;
			}
		}
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

/** Whether `moduleText`'s definition of `fnName` calls a generated `re_match_N` scanner. */
function moduleTextCalls(moduleText: string, fnName: string): boolean {
	const snake = fnName.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
	const start = moduleText.indexOf(`fn ${snake}(`);
	if (start < 0) return false;
	const end = moduleText.indexOf("\n}", start);
	const body = moduleText.slice(start, end < 0 ? undefined : end);
	return /re_match_\d+\(/.test(body);
}
