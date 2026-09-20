/**
 * Differential test between the reference interpreter and the implementation this repository
 * actually ships, over the whole corpus.
 *
 * It answers the only question that matters before any code generation: does the spec describe
 * the contract the published package already has, exactly, or a slightly different one?
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { build } from "esbuild";

import { buildCorpus } from "../codegen/corpus.ts";
import { type RunOptions, run, setLoader } from "../codegen/interpret.ts";
import { loadUtility } from "../codegen/ir.ts";

setLoader(loadUtility);

const root = resolve(import.meta.dirname, "../..");
const outDir = mkdtempSync(join(tmpdir(), "brutils-diff-"));
const outFile = join(outDir, "bundle.mjs");

await build({
	entryPoints: [join(root, "src/index.ts")],
	bundle: true,
	format: "esm",
	platform: "neutral",
	outfile: outFile,
	logLevel: "error",
});

const shipped = (await import(outFile)) as {
	isValidCpf: (value: unknown) => boolean;
	isValidPis: (value: unknown) => boolean;
	formatCpf: (value: unknown, options?: RunOptions) => string;
};

const corpus = buildCorpus();
const isValidCpf = loadUtility("is-valid-cpf");
const isValidPis = loadUtility("is-valid-pis");
const formatCpf = loadUtility("format-cpf");

type Check = {
	utility: string;
	input: string;
	options?: RunOptions;
	spec: unknown;
	shipped: unknown;
};

const mismatches: Check[] = [];

/**
 * Records a check, keeping it only when the two implementations disagree.
 *
 * @param {Check} check - What was run and what each side answered.
 * @returns {void}
 */
const compare = (check: Check): void => {
	if (check.spec !== check.shipped) mismatches.push(check);
};

const optionSets: RunOptions[] = [
	{},
	{ pad: true },
	{ obfuscate: true },
	{ pad: true, obfuscate: true },
];

for (const input of corpus) {
	compare({
		utility: "isValidCpf",
		input,
		spec: run(isValidCpf, "masked-strict", input),
		shipped: shipped.isValidCpf(input),
	});
	compare({
		utility: "isValidPis",
		input,
		spec: run(isValidPis, "masked-charset", input),
		shipped: shipped.isValidPis(input),
	});

	for (const options of optionSets) {
		compare({
			utility: "formatCpf",
			input,
			options,
			spec: run(formatCpf, "pattern-partial", input, options),
			shipped: shipped.formatCpf(input, options),
		});
	}
}

// Inputs that are not strings at all: the packages promise never to throw on them.
const hostile: unknown[] = [null, undefined, 12_345_678_909, Number.NaN, 0, -1, true, [], {}, 1.5];

for (const input of hostile) {
	compare({
		utility: "isValidCpf",
		input: String(input),
		spec: run(isValidCpf, "masked-strict", input),
		shipped: shipped.isValidCpf(input),
	});
	compare({
		utility: "isValidPis",
		input: String(input),
		spec: run(isValidPis, "masked-charset", input),
		shipped: shipped.isValidPis(input),
	});
	compare({
		utility: "formatCpf",
		input: String(input),
		spec: run(formatCpf, "pattern-partial", input),
		shipped: shipped.formatCpf(input),
	});
}

rmSync(outDir, { recursive: true, force: true });

const checks = corpus.length * (2 + optionSets.length) + hostile.length * 3;

if (mismatches.length > 0) {
	console.error(`${mismatches.length} of ${checks} checks disagree with the shipped package:`);
	for (const mismatch of mismatches.slice(0, 20)) console.error("", JSON.stringify(mismatch));
	process.exit(1);
}

console.log(
	`spec == shipped JavaScript package on ${checks} checks (${corpus.length} corpus inputs)`,
);
