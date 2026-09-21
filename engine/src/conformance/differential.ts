/**
 * Differential conformance.
 *
 * The reference interpreter and every generated target answer the same cases through the same
 * JSON protocol, and the harness compares them. Targets run in batches — one process per
 * language, JSON lines over stdin and stdout — so the cost of a case is one line, not one process.
 */

import { spawnSync } from "node:child_process";
import type { CProgram } from "../core/ir.ts";
import { Interpreter } from "../interp/interp.ts";
import type { Capabilities } from "../interp/interp.ts";
import { DomainFailure } from "../intrinsics/index.ts";
import type { SemType } from "../types.ts";
import type { Value } from "../values.ts";
import { NONE, civilDate, decimal, record, some } from "../values.ts";

export type Case = {
	readonly fn: string;
	readonly args: readonly Value[];
	/** A human readable label for the report. */
	readonly label?: string;
};

export type Outcome = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly error: string };

export type TargetRunner = {
	readonly name: string;
	readonly command: string;
	readonly args: readonly string[];
	readonly cwd: string;
};

/** Converts a semantic value into the plain JSON every generated driver speaks. */
export function toJson(value: Value): unknown {
	if (typeof value === "bigint") return Number(value);
	if (Array.isArray(value)) return value.map(toJson);
	if (typeof value === "object" && value !== null) {
		const tagged = value as { __kind: string };
		if (tagged.__kind === "none") return null;
		if (tagged.__kind === "some") return toJson((tagged as unknown as { value: Value }).value);
		if (tagged.__kind === "record") {
			const fields = (tagged as unknown as { fields: Record<string, Value> }).fields;
			const out: Record<string, unknown> = {};
			for (const [key, item] of Object.entries(fields)) out[key] = toJson(item);
			return out;
		}
		if (tagged.__kind === "decimal") return Number((tagged as unknown as { unscaled: bigint }).unscaled);
		if (tagged.__kind === "date") return (tagged as unknown as { days: number }).days;
	}
	return value;
}

/** Reads a driver's answer back into a semantic value, guided by the declared type. */
export function fromJson(raw: unknown, type: SemType): Value {
	switch (type.kind) {
		case "Option":
			return raw === null || raw === undefined ? NONE : some(fromJson(raw, type.inner));
		case "Int":
		case "Decimal":
		case "CivilDate":
		case "Instant":
		case "Duration":
			return BigInt(Math.trunc(Number(raw)));
		case "List":
			return (raw as unknown[]).map((item) => fromJson(item, type.elem));
		case "Record": {
			const fields: Record<string, Value> = {};
			for (const [key, item] of Object.entries(raw as Record<string, unknown>)) {
				fields[key] = item as Value;
			}
			return record(type.name, fields);
		}
		default:
			return raw as Value;
	}
}

/**
 * Adapts a case's arguments to the interpreter's representation.
 *
 * A case is written in the protocol's plain values (a civil date is a day count), while the
 * interpreter keeps the semantic ones; generated targets use the plain form directly, which is
 * exactly the representation freedom each backend is allowed.
 */
export function coerceValue(value: Value, type: SemType): Value {
	switch (type.kind) {
		case "CivilDate":
			return typeof value === "bigint" ? civilDate(Number(value)) : value;
		case "Decimal":
			return typeof value === "bigint" ? decimal(value, type.scale) : value;
		case "Option":
			return value === null || (typeof value === "object" && "__kind" in value && value.__kind === "none")
				? NONE
				: coerceValue(value, type.inner);
		case "List":
			return Array.isArray(value) ? value.map((item) => coerceValue(item, type.elem)) : value;
		default:
			return value;
	}
}

export function runInterpreter(
	program: CProgram,
	cases: readonly Case[],
	capabilities?: Capabilities,
): Outcome[] {
	return cases.map((testCase) => {
		const interpreter = new Interpreter(program, capabilities);
		const fn = program.functions.get(testCase.fn);
		const args = testCase.args.map((argument, index) => {
			const type = fn?.params[index]?.type;
			return type === undefined ? argument : coerceValue(argument, type);
		});
		try {
			const value = interpreter.call(testCase.fn, args);
			return { ok: true, value: toJson(value) };
		} catch (error) {
			if (error instanceof DomainFailure) return { ok: false, error: error.errorType };
			throw error;
		}
	});
}

/** Runs every case through one target process. */
export function runTarget(runner: TargetRunner, cases: readonly Case[]): Outcome[] {
	const input = `${cases
		.map((testCase) => JSON.stringify({ fn: testCase.fn, args: testCase.args.map(toJson) }))
		.join("\n")}\n`;
	const result = spawnSync(runner.command, [...runner.args], {
		cwd: runner.cwd,
		input,
		encoding: "utf8",
		maxBuffer: 256 * 1024 * 1024,
	});
	if (result.status !== 0) {
		throw new Error(`${runner.name} driver failed: ${result.stderr || result.stdout}`);
	}
	const lines = result.stdout.split("\n").filter((line) => line.trim() !== "");
	if (lines.length !== cases.length) {
		throw new Error(`${runner.name} driver answered ${lines.length} of ${cases.length} cases`);
	}
	return lines.map((line) => JSON.parse(line) as Outcome);
}

export type Divergence = {
	readonly target: string;
	readonly case: Case;
	readonly expected: Outcome;
	readonly actual: Outcome;
};

export function compare(
	reference: readonly Outcome[],
	actual: readonly Outcome[],
	cases: readonly Case[],
	target: string,
): Divergence[] {
	const divergences: Divergence[] = [];
	for (const [index, expected] of reference.entries()) {
		const observed = actual[index]!;
		if (!sameOutcome(expected, observed)) {
			divergences.push({ target, case: cases[index]!, expected, actual: observed });
		}
	}
	return divergences;
}

function sameOutcome(left: Outcome, right: Outcome): boolean {
	if (left.ok !== right.ok) return false;
	if (!left.ok || !right.ok) return (left as { error: string }).error === (right as { error: string }).error;
	return JSON.stringify(normalize(left.value)) === JSON.stringify(normalize(right.value));
}

/** Field names differ by convention across targets, so comparison ignores case and underscores. */
function normalize(value: unknown): unknown {
	if (value === undefined) return null;
	if (Array.isArray(value)) return value.map(normalize);
	if (typeof value === "object" && value !== null) {
		const entries = Object.entries(value as Record<string, unknown>)
			.map(([key, item]) => [key.toLowerCase().replaceAll("_", ""), normalize(item)] as const)
			.sort(([left], [right]) => left.localeCompare(right));
		return Object.fromEntries(entries);
	}
	return value;
}
