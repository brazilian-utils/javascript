/**
 * The conformance protocol: what a case is, how it is written down, and how an answer is
 * spelled so that eight languages can agree on it.
 *
 * A utility contributes one file under `conformance/cases/`, and that file only says which
 * arguments to replay. Everything else is derived: the expectation comes from calling the
 * package this repository ships, the columns come from the compiled signature, and the driver
 * that replays them in each language is generated. Adding a utility therefore touches its own
 * two files and nothing else.
 *
 * A case table is TSV rather than JSON because every target has to read it, and splitting a
 * line on a tab needs no parser in any of them. Three characters are escaped — backslash, tab
 * and newline — and each driver unescapes the same three.
 */
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

import { type FuncDecl, type Module, type StructDecl, type Ty } from "../compiler/ir.ts";

/**
 * The package this repository ships, as a recorder sees it.
 *
 * Untyped on purpose: a recorder names a function and hands it arguments a JavaScript
 * caller could write, which is the whole point of the boundary cases.
 */
export type Shipped = Record<string, (...args: unknown[]) => unknown>;

/** What a recorder under `conformance/cases/` exports. */
export type Recorder = {
	/** The module under `source/`, without the extension. */
	module: string;
	/**
	 * The argument lists to replay, as they would be written in JavaScript. A trailing options
	 * object is one argument; omit it to record the call without options.
	 *
	 * @param shipped - The package this repository ships, bundled.
	 * @returns The argument lists.
	 */
	inputs: (shipped: Shipped) => unknown[][];
	/**
	 * How to call the shipped function, for a utility that needs something around the call —
	 * a stubbed `fetch`, a fixed clock. The default is to apply it to the arguments.
	 */
	call?: (shipped: Shipped, fn: string, args: unknown[]) => Promise<unknown>;
	/**
	 * Serves whatever the generated code talks to while the other targets replay, for a utility
	 * that reaches the network. The returned function stops it.
	 *
	 * @param port - The port to listen on.
	 * @returns A function that stops the server.
	 */
	serve?: (port: number) => Promise<() => void>;
};

/** One recorded call: what went in, and what the shipped package answered or raised. */
export type Recorded = {
	args: unknown[];
	value?: unknown;
	failure?: { kind: string; message: string };
};

/** Every target a case can be replayed in. `cabi` is the C ABI rather than a language. */
export const TARGETS = [
	"typescript",
	"python",
	"ruby",
	"go",
	"rust",
	"java",
	"csharp",
	"cabi",
] as const;

/**
 * The targets that can still be handed a value their declared types do not allow.
 *
 * The other five lower `string | number` to `string` and a closed list of names to a list of
 * strings, so a call a JavaScript caller can make — a number where a string is declared, `null`
 * where a list is — has no form in them at all. TypeScript keeps the union and keeps the guard,
 * so it stays on this side of the line even though it is compiled.
 */
export const DYNAMIC = ["typescript", "python", "ruby"];

/**
 * The targets that tell "given as null" apart from "not given at all".
 *
 * An optional field in Python and Ruby is one value, so a caller there cannot say that it
 * passed `null`; TypeScript has both `null` and `undefined` and keeps the difference.
 */
export const NULLABLE = ["typescript"];

/** One column of a case table. */
export type Column =
	| { k: "targets" }
	/** A positional argument, as text. */
	| { k: "arg"; name: string; ty: Ty; index: number }
	/** `string` or `number`: which side of a `string | number` an argument was given as. */
	| { k: "kind"; name: string; index: number }
	/** `1` when an optional positional argument was given at all. */
	| { k: "set"; name: string; index: number }
	/**
	 * One field of the options record, empty when it was not given.
	 *
	 * A value the field's declared type does not allow — what an untyped JavaScript caller can
	 * still pass — is written as `!null`, `!string`, `!number`, `!object` or `!boolean`, and
	 * every driver that can express it turns the token back into a value of that shape.
	 */
	| { k: "option"; name: string; ty: Ty; field: string }
	| { k: "expect" };

/** Escapes the three characters the table format reserves. */
export const cell = (value: string): string =>
	value
		.replaceAll("\\", String.raw`\\`)
		.replaceAll("\t", String.raw`\t`)
		.replaceAll("\n", String.raw`\n`);

/** The options record of a function, when it takes one. */
export const optionsOf = (module: Module, entry: FuncDecl): StructDecl | undefined => {
	const named = entry.params.map((param) => param.ty).find((ty) => ty.k === "named");

	if (named === undefined) return;

	return module.structs.find((struct) => struct.name === named.name);
};

/**
 * The columns of one function's case table, in order.
 *
 * @param {Module} module - The compiled module.
 * @param {FuncDecl} entry - The exported function.
 * @returns {Column[]} The columns.
 */
export const columnsOf = (module: Module, entry: FuncDecl): Column[] => {
	const columns: Column[] = [{ k: "targets" }];

	for (const [index, param] of entry.params.entries()) {
		if (param.ty.k === "named") continue;

		if (param.optional) columns.push({ k: "set", name: param.name, index });

		columns.push({ k: "arg", name: param.name, ty: param.ty, index });

		// Any target can be handed text. Only the three that still check at run time can be
		// handed a number where the signature says otherwise, so the column exists for both
		// `string` and `string | number`, and the row says who can replay it.
		if (param.ty.k === "scalar" || param.ty.k === "string")
			columns.push({ k: "kind", name: param.name, index });
	}

	for (const field of optionsOf(module, entry)?.fields ?? [])
		columns.push({ k: "option", name: field.name, ty: field.ty, field: field.name });

	columns.push({ k: "expect" });

	return columns;
};

/** The header line of a case table, which is documentation: the drivers read by position. */
export const headerOf = (columns: Column[]): string =>
	columns
		.map((column) => {
			switch (column.k) {
				case "targets": {
					return "targets";
				}
				case "expect": {
					return "expect";
				}
				case "kind": {
					return `${column.name}#kind`;
				}
				case "set": {
					return `${column.name}#set`;
				}
				default: {
					return column.name;
				}
			}
		})
		.join("\t");

/**
 * Renders a value the way every target has to render it.
 *
 * Text, so that one comparison covers a boolean, a record and a list of five thousand rows.
 * A record is its fields in declared order joined by `|`, a list is its length followed by one
 * rendered item per line, and an absent optional is `~`.
 *
 * @param {unknown} value - The value the shipped package answered.
 * @param {Ty} ty - The declared type of that value.
 * @param {Module} module - The compiled module, for the records the type names.
 * @returns {string} The rendered value.
 */
export const render = (value: unknown, ty: Ty, module: Module): string => {
	switch (ty.k) {
		case "bool": {
			return value === true ? "true" : "false";
		}
		case "int": {
			return String(value);
		}
		case "opt": {
			return value === undefined || value === null ? "~" : render(value, ty.of, module);
		}
		case "list": {
			const items = value as unknown[];

			return [String(items.length), ...items.map((item) => render(item, ty.of, module))].join("\n");
		}
		case "named": {
			const struct = module.structs.find((entry) => entry.name === ty.name);
			const record = value as Record<string, unknown>;

			return (struct?.fields ?? [])
				.map((field) => render(record[field.name], field.ty, module))
				.join("|");
		}
		default: {
			return String(value);
		}
	}
};

/** How a failure is written down: the class the shipped package raised, and its message. */
export const renderFailure = (kind: string, message: string): string => `!${kind}|${message}`;

/**
 * Reads every recorder under `conformance/cases/`.
 *
 * @returns {Promise<Recorder[]>} The recorders, in name order. Empty when there are none,
 *   which is what the engine on its own looks like.
 */
export const loadRecorders = async (): Promise<Recorder[]> => {
	const directory = resolve(import.meta.dirname, "cases");
	let names: string[] = [];

	try {
		// A `_` prefix is a helper the recorders share, not a recorder.
		names = readdirSync(directory).filter((name) => name.endsWith(".ts") && !name.startsWith("_"));
	} catch {
		return [];
	}

	const found: Recorder[] = [];

	for (const name of names.sort()) {
		const loaded = (await import(resolve(directory, name))) as { recorder: Recorder };

		found.push(loaded.recorder);
	}

	return found;
};

/**
 * The one exported function of a module, which is what a utility is.
 *
 * @param {Module} module - The compiled module.
 * @returns {FuncDecl} Its exported function.
 */
export const entryOf = (module: Module): FuncDecl => {
	const exported = module.functions.filter((entry) => entry.exported);

	if (exported.length !== 1)
		throw new Error(
			`${module.name}: a utility exports one function, this one exports ${exported.length}`,
		);

	return exported[0];
};
