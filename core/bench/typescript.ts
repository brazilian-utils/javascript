/**
 * Benchmarks the generated TypeScript against the handwritten package it replaces.
 *
 * Both the handwritten `src/*` functions and the generated `core/out/typescript/*` functions take
 * a value "as written" (masked or not) and do their own normalization internally, so a single
 * variant per utility is a fair, apples-to-apples comparison — there is no normalization work one
 * side does that the other skips. This mirrors `conformance/bench.ts`, restructured to also emit
 * a machine-readable result line that `run.mjs` folds into the combined table.
 *
 * Convention shared by every language harness in this directory: 20,000-iteration warm-up,
 * 200,000 timed iterations, same process, same inputs, 1.5x budget, ratio reported as
 * generated / handwritten.
 */

import { isValidCpf as handwrittenCpf } from "../../src/is-valid-cpf/is-valid-cpf.ts";
import { isValidCnpj as handwrittenCnpj } from "../../src/is-valid-cnpj/is-valid-cnpj.ts";
import { formatCnpj as handwrittenFormatCnpj } from "../../src/format-cnpj/format-cnpj.ts";
import { isValidCpf as generatedCpf } from "../out/typescript/is-valid-cpf.ts";
import { isValidCnpj as generatedCnpj } from "../out/typescript/is-valid-cnpj.ts";
import { formatCnpj as generatedFormatCnpj } from "../out/typescript/format-cnpj.ts";

const BUDGET = 1.5;
const WARMUP = 20_000;
const ITERATIONS = 200_000;

const CPFS = ["123.456.789-09", "12345678909", "00000000000", "529.982.247-25", "abc"];
const CNPJS = ["12.345.678/0001-95", "12345678000195", "00000000000000", "Q0SLFMBD7VX439"];

type Row = {
	utility: string;
	variant: string;
	handwrittenMs: number;
	generatedMs: number;
	iterations: number;
};

type Disagreement = { utility: string; variant: string; input: unknown; handwritten: unknown; generated: unknown };

const rows: Row[] = [];
const disagreements: Disagreement[] = [];

function checkAgreement(
	utility: string,
	variant: string,
	inputs: readonly string[],
	handwritten: (input: string) => unknown,
	generated: (input: string) => unknown,
): void {
	for (const input of inputs) {
		const a = handwritten(input);
		const b = generated(input);
		if (a !== b) disagreements.push({ utility, variant, input, handwritten: a, generated: b });
	}
}

function measure(run: () => void): number {
	for (let index = 0; index < WARMUP; index++) run();
	const started = process.hrtime.bigint();
	for (let index = 0; index < ITERATIONS; index++) run();
	return Number(process.hrtime.bigint() - started) / 1e6;
}

function compare(
	utility: string,
	variant: string,
	inputs: readonly string[],
	handwritten: (input: string) => unknown,
	generated: (input: string) => unknown,
): void {
	checkAgreement(utility, variant, inputs, handwritten, generated);

	process.stdout.write(`${utility} (${variant})\n`);
	let cursor = 0;
	const handwrittenMs = measure(() => {
		handwritten(inputs[cursor++ % inputs.length]!);
	});
	process.stdout.write(`  handwritten                  ${handwrittenMs.toFixed(1)} ms\n`);
	cursor = 0;
	const generatedMs = measure(() => {
		generated(inputs[cursor++ % inputs.length]!);
	});
	process.stdout.write(`  generated                    ${generatedMs.toFixed(1)} ms\n`);

	rows.push({ utility, variant, handwrittenMs, generatedMs, iterations: ITERATIONS });
}

compare(
	"isValidCpf",
	"full-pipeline",
	CPFS,
	(input) => handwrittenCpf(input),
	(input) => generatedCpf(input),
);

compare(
	"isValidCnpj",
	"full-pipeline",
	CNPJS,
	(input) => handwrittenCnpj(input, { version: 2 }),
	(input) => generatedCnpj(input, "2"),
);

compare(
	"formatCnpj",
	"full-pipeline",
	CNPJS,
	(input) => handwrittenFormatCnpj(input, { pad: true }),
	(input) => generatedFormatCnpj(input, { pad: true, version: "1", obfuscate: false }),
);

process.stdout.write("\n| utility | variant | handwritten | generated | ratio | budget |\n");
process.stdout.write("| --- | --- | --- | --- | --- | --- |\n");
for (const row of rows) {
	const ratio = row.generatedMs / row.handwrittenMs;
	const ok = ratio <= BUDGET;
	process.stdout.write(
		`| \`${row.utility}\` | ${row.variant} | ${row.handwrittenMs.toFixed(1)} ms | ${row.generatedMs.toFixed(1)} ms | ${ratio.toFixed(2)}x | ${ok ? "within" : "OVER"} ${BUDGET}x |\n`,
	);
}

if (disagreements.length > 0) {
	process.stdout.write("\nDISAGREEMENTS:\n");
	for (const d of disagreements) {
		process.stdout.write(
			`  ${d.utility} (${d.variant}) input=${JSON.stringify(d.input)} handwritten=${JSON.stringify(d.handwritten)} generated=${JSON.stringify(d.generated)}\n`,
		);
	}
}

const result = {
	language: "typescript",
	toolchain: { node: process.version },
	rows,
	disagreements,
	skipped: [] as Array<{ utility: string; reason: string }>,
};
process.stdout.write(`BENCH_JSON ${JSON.stringify(result)}\n`);
