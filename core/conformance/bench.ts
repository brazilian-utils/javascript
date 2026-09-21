/**
 * Benchmarks the generated TypeScript against the handwritten implementation it replaces.
 *
 * The budget is 1.5x: generated code may be slower than the handwritten original by up to half
 * again, and anything beyond that is reported. Both run in the same process, on the same inputs,
 * after the same warm-up.
 */

import { isValidCpf as handwrittenCpf } from "../../src/is-valid-cpf/is-valid-cpf.ts";
import { isValidCnpj as handwrittenCnpj } from "../../src/is-valid-cnpj/is-valid-cnpj.ts";
import { formatCnpj as handwrittenFormatCnpj } from "../../src/format-cnpj/format-cnpj.ts";
import { isValidCpf as generatedCpf } from "../out/typescript/is-valid-cpf.ts";
import { isValidCnpj as generatedCnpj } from "../out/typescript/is-valid-cnpj.ts";
import { formatCnpj as generatedFormatCnpj } from "../out/typescript/format-cnpj.ts";

const BUDGET = 1.5;
const ITERATIONS = 200_000;

const CPFS = ["123.456.789-09", "12345678909", "00000000000", "529.982.247-25", "abc"];
const CNPJS = ["12.345.678/0001-95", "12345678000195", "00000000000000", "Q0SLFMBD7VX439"];

function measure(name: string, run: () => void): number {
	for (let index = 0; index < 20_000; index++) run();
	const started = process.hrtime.bigint();
	for (let index = 0; index < ITERATIONS; index++) run();
	const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
	process.stdout.write(`  ${name.padEnd(28)} ${elapsed.toFixed(1)} ms\n`);
	return elapsed;
}

type Comparison = { name: string; handwritten: number; generated: number };

const comparisons: Comparison[] = [];

function compare(name: string, handwritten: () => void, generated: () => void): void {
	process.stdout.write(`${name}\n`);
	comparisons.push({
		name,
		handwritten: measure("handwritten", handwritten),
		generated: measure("generated", generated),
	});
}

let cursor = 0;

compare(
	"isValidCpf",
	() => {
		handwrittenCpf(CPFS[cursor++ % CPFS.length]!);
	},
	() => {
		generatedCpf(CPFS[cursor++ % CPFS.length]!);
	},
);

compare(
	"isValidCnpj",
	() => {
		handwrittenCnpj(CNPJS[cursor++ % CNPJS.length]!, { version: 2 });
	},
	() => {
		generatedCnpj(CNPJS[cursor++ % CNPJS.length]!, "2");
	},
);

compare(
	"formatCnpj",
	() => {
		handwrittenFormatCnpj(CNPJS[cursor++ % CNPJS.length]!, { pad: true });
	},
	() => {
		generatedFormatCnpj(CNPJS[cursor++ % CNPJS.length]!, { pad: true, version: "1", obfuscate: false });
	},
);

process.stdout.write("\n| utility | handwritten | generated | ratio | budget |\n| --- | --- | --- | --- | --- |\n");

let failed = false;
for (const comparison of comparisons) {
	const ratio = comparison.generated / comparison.handwritten;
	const ok = ratio <= BUDGET;
	failed ||= !ok;
	process.stdout.write(
		`| \`${comparison.name}\` | ${comparison.handwritten.toFixed(1)} ms | ${comparison.generated.toFixed(1)} ms | ${ratio.toFixed(2)}x | ${ok ? "within" : "OVER"} ${BUDGET}x |\n`,
	);
}

if (failed) process.exitCode = 1;
