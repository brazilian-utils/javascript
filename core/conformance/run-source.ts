/**
 * Runs `core/source` itself, in Node, against the conformance vectors — no engine involved: no
 * compilation, no generation, just the migrated TypeScript executing. `verify.ts`'s "check" and
 * "generate" steps only prove the source compiles; this is the test of the harder claim, that it
 * actually runs and computes the right thing, so without this step the claim is not made.
 *
 * Each covered utility is called directly and compared against the published npm package
 * (`src/`), the same ground truth `conformance/run.ts` compares the reference interpreter
 * against. Not every utility can run yet: `format-currency` needs `dec.*` (no exact decimal in
 * JavaScript), `generate-cpf`/`generate-cnpj` need `random.nextU32` (an effect with no unbiased
 * `Math.random` equivalent), `get-holidays`/`is-business-day` need `date.*` (`new Date` is
 * refused), `get-address-info-by-cep` needs `http.request`/`task.race` (no shared meaning with
 * `fetch`'s `Promise<Response>`), and `format-cnpj` unconditionally calls a helper whose checked
 * accessor (`str.charAtOpt` in `patternSlots`/`formatWithPattern`, over the format pattern) has
 * no ordinary spelling — see core/docs/idiomatic-migration.md for the full reasoning on each.
 * `results` below is the exact, closed set this step exercises; a utility is added here only once
 * at least one of its cases can run.
 *
 * `isValidCpf` is the one utility that runs end to end for every case. `isValidCnpj` is partial:
 * everything except the alphanumeric (version "2") letter-detection helper (`hasLetter`, in
 * `lib/cnpj.ts`) runs, because that helper's index is never provably in range (see its comment),
 * so it keeps the checked `str.codeAtOpt` — the one checked *numeric* accessor the idiom table
 * has no ordinary spelling for. Every case is still attempted rather than pre-filtered, so a case
 * that reaches that line is confirmed to fail with exactly that gap, not silently dropped — a
 * change that fixes or breaks it is caught either way.
 */

import { isValidCpf as sourceIsValidCpf } from "../source/is-valid-cpf";
import { isValidCnpj as sourceIsValidCnpj } from "../source/is-valid-cnpj";

import { isValidCpf as referenceIsValidCpf } from "../../src/is-valid-cpf/is-valid-cpf";
import { isValidCnpj as referenceIsValidCnpj } from "../../src/is-valid-cnpj/is-valid-cnpj";

import { cnpjCases, cpfCases } from "./cases";

/**
 * The `ReferenceError` an unmigrated ambient identifier (`str`, `seq`, `re`, `int`, `dec`,
 * `date`, `random`, `task`, `clock`, `http`) throws when the real module actually executes that
 * line — the signature of the one documented, known gap, not a stand-in for "anything failed".
 */
function isAmbientGap(error: unknown): boolean {
	return (
		error instanceof ReferenceError &&
		/^(str|seq|re|int|dec|date|random|task|clock|http) is not defined$/.test(error.message)
	);
}

type Case = { readonly fn: string; readonly args: readonly unknown[]; readonly label?: string };

type Coverage = {
	readonly name: string;
	total: number;
	matched: number;
	blocked: number;
	readonly failures: string[];
};

/**
 * Runs one utility's cases through the migrated source and the published package, and reports
 * three outcomes per case: matched (both agree), blocked (the source hit the one documented
 * ambient gap), or a failure (anything else — a real mismatch, or an unexpected throw).
 */
function run(
	name: string,
	cases: readonly Case[],
	call: (args: readonly unknown[]) => unknown,
	reference: (args: readonly unknown[]) => unknown,
): Coverage {
	const coverage: Coverage = { name, total: cases.length, matched: 0, blocked: 0, failures: [] };

	for (const testCase of cases) {
		let actual: unknown;
		try {
			actual = call(testCase.args);
		} catch (error) {
			if (isAmbientGap(error)) {
				coverage.blocked += 1;
			} else {
				coverage.failures.push(`${name}(${JSON.stringify(testCase.args)}) threw ${String(error)}`);
			}
			continue;
		}

		const expected = reference(testCase.args);
		if (JSON.stringify(actual) === JSON.stringify(expected)) {
			coverage.matched += 1;
		} else {
			coverage.failures.push(
				`${name}(${JSON.stringify(testCase.args)}) expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
			);
		}
	}

	return coverage;
}

const results: Coverage[] = [
	run(
		"is-valid-cpf::isValidCpf",
		cpfCases(),
		(args) => sourceIsValidCpf(args[0] as string),
		(args) => referenceIsValidCpf(args[0] as string),
	),
	run(
		"is-valid-cnpj::isValidCnpj",
		cnpjCases(),
		(args) => sourceIsValidCnpj(args[0] as string, args[1] as "1" | "2"),
		(args) => referenceIsValidCnpj(args[0] as string, { version: args[1] === "2" ? 2 : 1 }),
	),
];

/** Utilities this step deliberately does not attempt, and why — see the file header for detail. */
const NOT_COVERED = [
	"format-currency::formatCurrency (dec.*, no exact decimal in JavaScript)",
	"generate-cpf::generateCpf (random.nextU32, an effect)",
	"generate-cnpj::generateCnpj (random.nextU32, an effect)",
	"get-holidays::getHolidays (date.*, new Date has no proleptic-Gregorian equivalent)",
	"is-business-day::isBusinessDay (date.*, same as get-holidays)",
	"get-address-info-by-cep::getAddressInfoByCep (http.request/task.race, effects; also needs a live network to compare)",
	"format-cnpj::formatCnpj (str.charAtOpt over the format pattern, unconditional on every call — see the file header)",
];

let failed = false;

for (const coverage of results) {
	const status = coverage.failures.length === 0 ? "ok" : "FAILED";
	process.stdout.write(
		`${status.padEnd(7)} ${coverage.name}: ${coverage.matched} matched, ${coverage.blocked} blocked (known gap), ` +
			`${coverage.total} total\n`,
	);
	for (const failure of coverage.failures.slice(0, 5)) {
		process.stdout.write(`        ${failure}\n`);
	}
	if (coverage.failures.length > 5) {
		process.stdout.write(`        … and ${coverage.failures.length - 5} more\n`);
	}
	if (coverage.failures.length > 0) failed = true;
}

process.stdout.write(`skipped ${NOT_COVERED.length} utilities, blocked on an intrinsic with no ordinary spelling yet:\n`);
for (const entry of NOT_COVERED) {
	process.stdout.write(`        ${entry}\n`);
}

// `isValidCpf` is fully migrated: every case must run for real, none may fall back to the
// known-gap path, or this step would be quietly certifying less than it claims.
{
	const coverage = results.find((entry) => entry.name === "is-valid-cpf::isValidCpf")!;
	if (coverage.blocked !== 0) {
		process.stdout.write(`FAILED  ${coverage.name}: expected to run fully, but ${coverage.blocked} case(s) hit an ambient gap\n`);
		failed = true;
	}
	if (coverage.total === 0) {
		process.stdout.write(`FAILED  ${coverage.name}: 0 cases — the vector set shrank to nothing\n`);
		failed = true;
	}
}

// `isValidCnpj` is only partially migrated (see the file header): every case must either match
// the reference or hit exactly the documented gap, and at least one case of each must occur, so
// neither half of the claim ("this runs" / "this specific part doesn't yet") can drift unnoticed.
{
	const coverage = results.find((entry) => entry.name === "is-valid-cnpj::isValidCnpj")!;
	if (coverage.matched === 0) {
		process.stdout.write(`FAILED  ${coverage.name}: 0 cases matched — the runnable part stopped running\n`);
		failed = true;
	}
	if (coverage.blocked === 0) {
		process.stdout.write(
			`FAILED  ${coverage.name}: 0 cases hit the known gap — either it was fixed (update this step and ` +
				"core/docs/idiomatic-migration.md to say so) or the vectors stopped exercising it\n",
		);
		failed = true;
	}
}

if (failed) process.exitCode = 1;
