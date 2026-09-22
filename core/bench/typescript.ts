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
import { formatCurrency as handwrittenFormatCurrency } from "../../src/format-currency/format-currency.ts";
import { getHolidays as handwrittenGetHolidays } from "../../src/get-holidays/get-holidays.ts";
import { isBusinessDay as handwrittenIsBusinessDay } from "../../src/is-business-day/is-business-day.ts";
import { generateCpf as handwrittenGenerateCpf } from "../../src/generate-cpf/generate-cpf.ts";
import { generateCnpj as handwrittenGenerateCnpj } from "../../src/generate-cnpj/generate-cnpj.ts";
import { isValidCpf as generatedCpf } from "../out/typescript/is-valid-cpf.ts";
import { isValidCnpj as generatedCnpj } from "../out/typescript/is-valid-cnpj.ts";
import { formatCnpj as generatedFormatCnpj } from "../out/typescript/format-cnpj.ts";
import { formatCurrency as generatedFormatCurrency } from "../out/typescript/format-currency.ts";
import { getHolidays as generatedGetHolidays, type Holiday as GeneratedHoliday } from "../out/typescript/get-holidays.ts";
import { isBusinessDay as generatedIsBusinessDay } from "../out/typescript/is-business-day.ts";
import { generateCpf as generatedGenerateCpf } from "../out/typescript/generate-cpf.ts";
import { generateCnpj as generatedGenerateCnpj } from "../out/typescript/generate-cnpj.ts";
// `std/date`'s own conversion rather than `lib/civil`'s `civilDate` wrapper: `civilDate` exists to
// name an unreachable fallback for a date the caller has not proven valid, and every call to it in
// the core passes a constant month, so it specializes away (ADR 0004) and has no single name in
// the output to import. `daysFromCivil` is the std function underneath it and stays put.
import { daysFromCivil } from "../out/typescript/std/date.ts";

const BUDGET = 1.5;
const WARMUP = 20_000;
const ITERATIONS = 200_000;

const CPFS = ["123.456.789-09", "12345678909", "00000000000", "529.982.247-25", "abc"];
const CNPJS = ["12.345.678/0001-95", "12345678000195", "00000000000000", "Q0SLFMBD7VX439"];

// Raw doubles, the shape `src/format-currency`'s own callers use; `toCents` turns each into the
// scaled integer (Decimal<2>) the generated core requires. None of these are round-trip-ambiguous
// doubles (no 1.005-style case), so simple rounding is enough -- the exact round-half-away-from-
// zero-on-the-shortest-decimal rule `conformance/cases.ts`'s `toScaled` implements is not needed
// here. Includes a negative value on purpose: see the README's "formatCurrency" honesty note for
// what that turns up.
const CURRENCY_VALUES = [0, 1234.56, -1234.56, 0.5, 999999.99, 10];
const toCents = (value: number): number => Math.round(value * 100);

// Years chosen to exercise the interesting cases: 2000 is the year `docs/contracts.md` calls out
// for the Tiradentes/Sexta-feira Santa stable-sort tie (both fall on 21 April), 2099 is the top of
// the supported range, 1987 has no Consciência Negra entry (added nationally only from 2024).
const HOLIDAY_YEARS = [2024, 2000, 2023, 1987, 2099];

// (year, month, day) tuples, not raw epoch-day integers or `Date`s, so the same triple can be
// turned into whichever shape each side's API wants -- a `Date` for the handwritten side, a
// `daysFromCivil` (epoch-day integer) for the generated core, per `docs/contracts.md`'s "local
// calendar day" convention.
const BUSINESS_DAY_CASES: readonly { year: number; month: number; day: number }[] = [
	{ year: 2024, month: 1, day: 2 }, // ordinary Tuesday
	{ year: 2024, month: 1, day: 1 }, // Ano novo (national)
	{ year: 2024, month: 1, day: 6 }, // Saturday
	{ year: 2024, month: 2, day: 13 }, // Carnaval (terça-feira), optional
	{ year: 2024, month: 11, day: 20 }, // Consciência Negra, national since 2024
];

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

// formatCurrency has no "full-pipeline" shape to compare at all: the generated core's contract
// (docs/contracts.md) always takes an already-scaled Decimal<2>, never a raw double -- scaling is
// DX work, done once outside the core, not something the generated side can be asked to redo. So
// this is "normalized" for the same reason Python's CPF rows are: both sides receive the value
// pre-processed into the shape their own API expects, which happens to hand the generated side
// less work than a caller starting from a raw double would.
{
	const utility = "formatCurrency";
	const variant = "normalized";
	for (const value of CURRENCY_VALUES) {
		const a = handwrittenFormatCurrency(value, { symbol: true });
		const b = generatedFormatCurrency(toCents(value), true);
		if (a !== b) disagreements.push({ utility, variant, input: value, handwritten: a, generated: b });
	}

	process.stdout.write(`${utility} (${variant})\n`);
	let cursor = 0;
	const handwrittenMs = measure(() => {
		handwrittenFormatCurrency(CURRENCY_VALUES[cursor++ % CURRENCY_VALUES.length]!, { symbol: true });
	});
	process.stdout.write(`  handwritten                  ${handwrittenMs.toFixed(1)} ms\n`);
	cursor = 0;
	const generatedMs = measure(() => {
		generatedFormatCurrency(toCents(CURRENCY_VALUES[cursor++ % CURRENCY_VALUES.length]!), true);
	});
	process.stdout.write(`  generated                    ${generatedMs.toFixed(1)} ms\n`);
	rows.push({ utility, variant, handwrittenMs, generatedMs, iterations: ITERATIONS });
}

// getHolidays: both sides take a plain year and do their own computation -- full-pipeline. The
// handwritten side memoizes per year (src/get-holidays/get-holidays.ts's `cache`), which the
// generated core does not do at all; see the README for what that does to this row's ratio.
{
	const utility = "getHolidays";
	const variant = "full-pipeline";
	const holidaysEqual = (year: number): { equal: boolean; handwritten: unknown; generated: unknown } => {
		const handwritten = handwrittenGetHolidays(year);
		const generated = generatedGetHolidays(year);
		const generatedProjection = generated.map((holiday: GeneratedHoliday) => ({
			name: holiday.name,
			date: holiday.date,
			type: holiday.type,
		}));
		const handwrittenProjection = handwritten.map((holiday) => ({
			name: holiday.name,
			date: daysFromCivil(holiday.date.getFullYear(), holiday.date.getMonth() + 1, holiday.date.getDate()),
			type: holiday.type,
		}));
		const equal = JSON.stringify(handwrittenProjection) === JSON.stringify(generatedProjection);
		return { equal, handwritten: handwrittenProjection, generated: generatedProjection };
	};
	for (const year of HOLIDAY_YEARS) {
		const { equal, handwritten, generated } = holidaysEqual(year);
		if (!equal) disagreements.push({ utility, variant, input: year, handwritten, generated });
	}

	process.stdout.write(`${utility} (${variant})\n`);
	let cursor = 0;
	const handwrittenMs = measure(() => {
		handwrittenGetHolidays(HOLIDAY_YEARS[cursor++ % HOLIDAY_YEARS.length]!);
	});
	process.stdout.write(`  handwritten                  ${handwrittenMs.toFixed(1)} ms\n`);
	cursor = 0;
	const generatedMs = measure(() => {
		generatedGetHolidays(HOLIDAY_YEARS[cursor++ % HOLIDAY_YEARS.length]!);
	});
	process.stdout.write(`  generated                    ${generatedMs.toFixed(1)} ms\n`);
	rows.push({ utility, variant, handwrittenMs, generatedMs, iterations: ITERATIONS });
}

// isBusinessDay: full-pipeline. Both sides receive the same (year, month, day) local calendar day,
// each turned into the shape its own API wants -- a `Date` built from local components for the
// handwritten side, a `daysFromCivil` epoch-day integer for the generated core.
{
	const utility = "isBusinessDay";
	const variant = "full-pipeline";
	for (const { year, month, day } of BUSINESS_DAY_CASES) {
		const a = handwrittenIsBusinessDay(new Date(year, month - 1, day));
		const b = generatedIsBusinessDay(daysFromCivil(year, month, day), true);
		if (a !== b) {
			disagreements.push({ utility, variant, input: { year, month, day }, handwritten: a, generated: b });
		}
	}

	process.stdout.write(`${utility} (${variant})\n`);
	let cursor = 0;
	const handwrittenMs = measure(() => {
		const { year, month, day } = BUSINESS_DAY_CASES[cursor++ % BUSINESS_DAY_CASES.length]!;
		handwrittenIsBusinessDay(new Date(year, month - 1, day));
	});
	process.stdout.write(`  handwritten                  ${handwrittenMs.toFixed(1)} ms\n`);
	cursor = 0;
	const generatedMs = measure(() => {
		const { year, month, day } = BUSINESS_DAY_CASES[cursor++ % BUSINESS_DAY_CASES.length]!;
		generatedIsBusinessDay(daysFromCivil(year, month, day), true);
	});
	process.stdout.write(`  generated                    ${generatedMs.toFixed(1)} ms\n`);
	rows.push({ utility, variant, handwrittenMs, generatedMs, iterations: ITERATIONS });
}

// generateCpf / generateCnpj draw at random, so there is no fixed value to compare for equality.
// The agreement check instead of that: every value either side produces must validate under BOTH
// validators -- its own port's and the generated core's -- before either side is timed. A fast
// generator that mints invalid documents is a defect, not a pass.
const GENERATE_SAMPLES = 500;

function checkGeneratorAgreement(
	utility: string,
	variant: string,
	handwrittenGenerate: () => string,
	handwrittenIsValid: (value: string) => boolean,
	generatedGenerate: () => string,
	generatedIsValid: (value: string) => boolean,
): void {
	for (let index = 0; index < GENERATE_SAMPLES; index++) {
		const fromHandwritten = handwrittenGenerate();
		if (!handwrittenIsValid(fromHandwritten)) {
			disagreements.push({
				utility,
				variant,
				input: fromHandwritten,
				handwritten: "rejected by its own port's validator",
				generated: "n/a",
			});
		}
		if (!generatedIsValid(fromHandwritten)) {
			disagreements.push({
				utility,
				variant,
				input: fromHandwritten,
				handwritten: "valid (own validator)",
				generated: "rejected by the generated core's validator",
			});
		}

		const fromGenerated = generatedGenerate();
		if (!generatedIsValid(fromGenerated)) {
			disagreements.push({
				utility,
				variant,
				input: fromGenerated,
				handwritten: "n/a",
				generated: "rejected by the generated core's own validator",
			});
		}
		if (!handwrittenIsValid(fromGenerated)) {
			disagreements.push({
				utility,
				variant,
				input: fromGenerated,
				handwritten: "rejected by its own port's validator",
				generated: "valid (own validator)",
			});
		}
	}
}

function compareGenerate(
	utility: string,
	handwrittenGenerate: () => string,
	generatedGenerate: () => string,
): void {
	const variant = "generate";
	process.stdout.write(`${utility} (${variant})\n`);
	const handwrittenMs = measure(() => {
		handwrittenGenerate();
	});
	process.stdout.write(`  handwritten                  ${handwrittenMs.toFixed(1)} ms\n`);
	const generatedMs = measure(() => {
		generatedGenerate();
	});
	process.stdout.write(`  generated                    ${generatedMs.toFixed(1)} ms\n`);
	rows.push({ utility, variant, handwrittenMs, generatedMs, iterations: ITERATIONS });
}

checkGeneratorAgreement(
	"generateCpf",
	"generate",
	() => handwrittenGenerateCpf(),
	(value) => handwrittenCpf(value),
	() => generatedGenerateCpf(),
	(value) => generatedCpf(value),
);
compareGenerate(
	"generateCpf",
	() => handwrittenGenerateCpf(),
	() => generatedGenerateCpf(),
);

checkGeneratorAgreement(
	"generateCnpj",
	"generate",
	() => handwrittenGenerateCnpj(),
	(value) => handwrittenCnpj(value, { version: 1 }),
	() => generatedGenerateCnpj(),
	(value) => generatedCnpj(value, "1"),
);
compareGenerate(
	"generateCnpj",
	() => handwrittenGenerateCnpj(),
	() => generatedGenerateCnpj(),
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
