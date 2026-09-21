/**
 * The differential runner.
 *
 * Compiles the project, generates every target in both idiom modes, and compares the reference
 * interpreter, the published npm package and each generated target on the same cases.
 */

import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { compileProject } from "../../engine/src/api.ts";
import { compare, runInterpreter, runTarget } from "../../engine/src/conformance/differential.ts";
import type { Case, Divergence, Outcome } from "../../engine/src/conformance/differential.ts";
import { HTTP_FIXTURES, allCases } from "./cases.ts";
import { formatCurrency } from "../../src/format-currency/format-currency.ts";
import { isValidCpf } from "../../src/is-valid-cpf/is-valid-cpf.ts";
import { isValidCnpj } from "../../src/is-valid-cnpj/is-valid-cnpj.ts";
import { formatCnpj } from "../../src/format-cnpj/format-cnpj.ts";
import type { Value } from "../../engine/src/values.ts";
import { getHolidays } from "../../src/get-holidays/get-holidays.ts";
import { isBusinessDay } from "../../src/is-business-day/is-business-day.ts";

const ROOT = resolve(import.meta.dirname, "..");

/** What the published package answers, which is the behavior the core must reproduce. */
const REFERENCE: Record<string, (args: readonly Value[]) => unknown> = {
	"is-valid-cpf::isValidCpf": (args) => isValidCpf(args[0] as string),
	// The DX maps its own options onto the core's contract: a `version` that is not 2 is read as
	// the numeric format, exactly as the published package documents.
	"is-valid-cnpj::isValidCnpj": (args) =>
		isValidCnpj(args[0] as string, { version: args[1] === "2" ? 2 : 1 }),
	// The DX turns a host `Date` into a civil date and back; the core never sees a zone.
	"get-holidays::getHolidays": (args) =>
		getHolidays({ year: Number(args[0] as bigint) }).map((holiday) => ({
			name: holiday.name,
			date: Math.floor(
				Date.UTC(holiday.date.getFullYear(), holiday.date.getMonth(), holiday.date.getDate()) / 86_400_000,
			),
			type: holiday.type,
		})),
	"is-business-day::isBusinessDay": (args) => {
		const days = Number(args[0] as bigint);
		const utc = new Date(days * 86_400_000);
		return isBusinessDay(new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate()), {
			includeOptional: args[1] as boolean,
		});
	},
	// The core takes the exact amount; the double and the rounding rule stay on the DX side.
	"format-currency::formatCurrency": (args) =>
		formatCurrency(args[0] as number, { symbol: args[1] as boolean }),
	"format-cnpj::formatCnpj": (args) => {
		const options = args[1] as { fields: Record<string, boolean | string> };
		return formatCnpj(args[0] as string, {
			pad: options.fields["pad"] as boolean,
			version: options.fields["version"] === "2" ? 2 : 1,
			obfuscate: options.fields["obfuscate"] as boolean,
		});
	},
};

/**
 * What the published package answers, for the utilities whose behavior can be reproduced offline.
 *
 * `getAddressInfoByCep` is not among them: the published implementation performs real requests, so
 * its contract is recorded in docs/contracts.md and checked against the reference interpreter and
 * the three targets instead.
 */
function runReference(cases: readonly Case[]): { outcomes: Outcome[]; compared: number[] } {
	const outcomes: Outcome[] = [];
	const compared: number[] = [];
	for (const [index, testCase] of cases.entries()) {
		const fn = REFERENCE[testCase.fn];
		if (fn === undefined) {
			outcomes.push({ ok: true, value: null });
			continue;
		}
		compared.push(index);
		const reference = (testCase as { reference?: readonly Value[] }).reference;
		outcomes.push({ ok: true, value: fn(reference ?? testCase.args) });
	}
	return { outcomes, compared };
}

function runners(mode: "idiomatic" | "plain") {
	const suffix = mode === "plain" ? "-plain" : "";
	return [
		{
			name: `typescript${suffix}`,
			command: process.execPath,
			args: ["_driver.ts"],
			cwd: resolve(ROOT, `out/typescript${suffix}`),
		},
		{
			name: `python${suffix}`,
			command: "python3",
			args: ["-m", `python${suffix}._driver`],
			cwd: resolve(ROOT, "out"),
		},
		{
			name: `go${suffix}`,
			command: "go",
			args: ["run", "./cmd/driver"],
			cwd: resolve(ROOT, `out/go${suffix}`),
		},
	];
}

function main(): void {
	const only = process.argv.includes("--target") ? process.argv[process.argv.indexOf("--target") + 1] : undefined;
	const modes: ("idiomatic" | "plain")[] = process.argv.includes("--idiomatic-only")
		? ["idiomatic"]
		: ["idiomatic", "plain"];

	const compilation = compileProject(resolve(ROOT, "source"));
	const cases = allCases();

	// Every target reads the same scripted Http, so a race is decided by the same latencies.
	for (const mode of ["idiomatic", "plain"] as const) {
		for (const runner of runners(mode)) {
			const directory = runner.name.startsWith("python") ? resolve(runner.cwd, runner.args[1]!.split(".")[0]!) : runner.cwd;
			if (existsSync(directory)) {
				writeFileSync(resolve(directory, "fixtures.json"), `${JSON.stringify(HTTP_FIXTURES, null, "\t")}\n`);
			}
		}
	}

	const reference = runInterpreter(compilation.program, cases, {
		http: (request) => {
			const fixture = HTTP_FIXTURES[request.url];
			return fixture === undefined
				? undefined
				: { status: fixture.status, body: fixture.body, latencyMillis: fixture.latencyMillis };
		},
	});

	const { outcomes: npmOutcomes, compared } = runReference(cases);
	const comparedCases = compared.map((index) => cases[index]!);
	const npmDivergences = compare(
		compared.map((index) => npmOutcomes[index]!),
		compared.map((index) => reference[index]!),
		comparedCases,
		"interpreter vs npm",
	);
	report("interpreter vs npm", comparedCases.length, npmDivergences);

	let failures = npmDivergences.length;

	for (const mode of modes) {
		for (const runner of runners(mode)) {
			if (only !== undefined && !runner.name.startsWith(only)) continue;
			if (!existsSync(runner.cwd)) {
				process.stdout.write(`${runner.name}: skipped, ${runner.cwd} is missing\n`);
				continue;
			}
			const outcomes = runTarget(runner, cases);
			const divergences = compare(reference, outcomes, cases, runner.name);
			report(runner.name, cases.length, divergences);
			failures += divergences.length;
		}
	}

	if (failures > 0) process.exitCode = 1;
}

/** BigInt is not JSON, and a divergence report has to print one. */
function show(value: unknown): string {
	return JSON.stringify(value, (_key, item: unknown) => (typeof item === "bigint" ? item.toString() : item));
}

function report(name: string, total: number, divergences: readonly Divergence[]): void {
	const matched = total - divergences.length;
	process.stdout.write(`${name}: ${matched}/${total} matched\n`);
	for (const divergence of divergences.slice(0, 5)) {
		process.stdout.write(
			`  ${divergence.case.fn}(${show(divergence.case.args)}) expected ${show(divergence.expected)}, got ${show(divergence.actual)}\n`,
		);
	}
	if (divergences.length > 5) process.stdout.write(`  … and ${divergences.length - 5} more\n`);
}

main();
