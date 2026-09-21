/**
 * Records what the shipped package answers, as the table every target replays.
 *
 * One file per utility under `conformance/cases/` says which arguments to try. This turns each
 * of those into a row: the arguments in the columns the compiled signature asks for, and the
 * answer — or the failure — rendered the one way `cases.ts` defines.
 *
 * It also decides, per row, which targets can express the call at all. A number where the
 * signature says `string | number`, or `null` where it says a list of names, is a call a
 * JavaScript caller can make and a Go caller cannot, and a row that says so is more useful
 * than a row quietly left out.
 *
 * Usage: `node spec/bridge/conformance/record.ts`
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { compileModule } from "../compiler/frontend.ts";
import { type FuncDecl } from "../compiler/ir.ts";
import {
	type Column,
	DYNAMIC,
	type Shipped,
	NULLABLE,
	TARGETS,
	cell,
	columnsOf,
	entryOf,
	headerOf,
	loadRecorders,
	render,
	renderFailure,
} from "./cases.ts";
import { loadShipped } from "./shipped.ts";

const bridge = resolve(import.meta.dirname, "..");

/** Writes an argument into the column that carries it. */
const encode = (column: Column, args: unknown[], options: Record<string, unknown>): string => {
	if (column.k === "targets" || column.k === "expect") return "";

	if (column.k === "set") return args[column.index] === undefined ? "" : "1";

	if (column.k === "kind") return typeof args[column.index] === "number" ? "number" : "string";

	if (column.k === "arg") {
		const value = args[column.index] as string | number | undefined | null;

		return value === undefined || value === null ? "" : String(value);
	}

	if (!(column.field in options)) return "";

	const value = options[column.field] as string | number | boolean | unknown[] | null;

	if (column.ty.k === "bool") return value === true ? "1" : "0";

	if (column.ty.k === "list") {
		if (value === null) return "!null";
		if (!Array.isArray(value)) return `!${typeof value}`;

		return value.length === 0 ? "[]" : value.join("|");
	}

	return String(value);
};

/**
 * Which targets can be handed this call, given what their declared types allow.
 *
 * Three answers. A number where the signature says `string` needs a host that still checks at
 * run time. `null` where it says a list needs one that also tells `null` apart from "not
 * given", which the optional of a Python or Ruby signature does not. Everything else is `*`.
 */
const expressibleIn = (columns: Column[], row: string[]): string => {
	let allowed: readonly string[] = TARGETS;

	const narrow = (to: readonly string[]): void => {
		allowed = allowed.filter((target) => to.includes(target));
	};

	for (const [index, column] of columns.entries()) {
		if (column.k === "kind" && row[index] === "number") narrow(DYNAMIC);

		if (column.k === "option" && row[index].startsWith("!"))
			narrow(row[index] === "!null" ? NULLABLE : DYNAMIC);
	}

	return allowed.length === TARGETS.length ? "*" : allowed.join("|");
};

/** Splits an argument list into the positional arguments and the options record. */
const split = (
	args: unknown[],
	entry: FuncDecl,
): { positional: unknown[]; options: Record<string, unknown> } => {
	const found: unknown[] = [];
	let options: Record<string, unknown> = {};

	for (const [index, param] of entry.params.entries()) {
		if (param.ty.k === "named") {
			options = (args[index] ?? {}) as Record<string, unknown>;
			continue;
		}

		found[index] = args[index];
	}

	return { positional: found, options };
};

const shipped = await loadShipped();
const recorders = await loadRecorders();

if (recorders.length === 0) console.log("no utilities under conformance/cases: nothing to record");

mkdirSync(resolve(bridge, "conformance/recorded"), { recursive: true });

for (const recorder of recorders) {
	const module = compileModule(resolve(bridge, "source", `${recorder.module}.ts`));
	const entry = entryOf(module);
	const columns = columnsOf(module, entry);
	const call =
		recorder.call ??
		(async (target: Shipped, fn: string, args: unknown[]): Promise<unknown> => {
			const answered = target[fn](...args);

			return await answered;
		});

	const lines = [headerOf(columns)];
	let raising = 0;
	let partial = 0;

	for (const args of recorder.inputs(shipped)) {
		const { positional, options } = split(args, entry);
		let expect = "";

		try {
			const answered = await call(shipped, entry.name, args);

			expect = render(answered, entry.ret, module);
		} catch (error) {
			const raised = error as Error;

			expect = renderFailure(raised.constructor.name, raised.message);
			raising++;
		}

		const row = columns.map((column) =>
			column.k === "targets" || column.k === "expect" ? "" : encode(column, positional, options),
		);
		const targets = expressibleIn(columns, row);

		if (targets !== "*") partial++;

		for (const [index, column] of columns.entries()) {
			if (column.k === "targets") row[index] = targets;
			if (column.k === "expect") row[index] = expect;
		}

		lines.push(row.map((value) => cell(value)).join("\t"));
	}

	writeFileSync(
		resolve(bridge, "conformance/recorded", `${recorder.module}.tsv`),
		`${lines.join("\n")}\n`,
	);

	console.log(
		`${recorder.module.padEnd(26)} ${lines.length - 1} cases, ${raising} raising, ${partial} not expressible everywhere`,
	);
}
