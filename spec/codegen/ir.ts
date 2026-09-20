/**
 * Loader for the language neutral utility specs under `spec/utilities`.
 *
 * It resolves the charset and check digit references into plain data, so an emitter only ever
 * sees code point ranges and weight vectors, never a regex or a language specific shorthand.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const specDir = resolve(import.meta.dirname, "..");

export type CharsetRanges = { single: number[]; ranges: [number, number][] };

export type CheckDigitAlgorithm = {
	description: string;
	modulus: number;
	weights: { kind: "descending"; from: string; to: number } | { kind: "fixed"; values: number[] };
	reduce: "modulus-minus-remainder";
	clamp: { atLeast: number; to: number };
	positions: number[];
	cumulative: boolean;
	source: string;
};

export type Step =
	| { op: "guard-shape"; target: "raw"; trim?: string; groups: number[]; separators?: string }
	| { op: "guard-charset"; target: "raw"; allow: string[] }
	| { op: "sanitize"; keep: string; into: string }
	| { op: "guard-length"; target: string; equals: number }
	| { op: "guard-repeated"; target: string }
	| { op: "verify-check-digits"; target: string; checkDigit: string }
	| { op: "guard-valid"; utility: string; profile: string }
	| {
			op: "apply-pattern";
			target: string;
			engine: "pattern-v1";
			pattern: string;
			variants?: Record<string, string>;
	  };

export type OptionSpec = { name: string; type: string; default: boolean; read: string };

export type Profile = {
	description: string;
	/** What a formatter answers when the value has no formatting: `""` or the language's null. */
	absent?: "empty-string" | "null";
	pipeline: Step[];
	options?: OptionSpec[];
};

/** A known, documented difference between a package and the profile it otherwise implements. */
export type Deviation = { inputs: string[]; reason: string; issue?: string };

export type Adoption = { profile: string; options?: string[]; knownDeviations?: Deviation[] };

export type UtilitySpec = {
	id: string;
	kind: "validator" | "formatter";
	summary: string;
	sources: { role: string; url: string }[];
	names: Record<string, { module: string; function: string }>;
	input: { name: string; type: string; onWrongType?: string; onNullish?: string };
	output: { type: string };
	adopted: Record<string, Adoption>;
	profiles: Record<string, Profile>;
};

/**
 * Reads a JSON file of the specification.
 *
 * @param {string} path - The absolute path to read.
 * @returns {unknown} The parsed contents, for the caller to narrow.
 */
const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

type CharsetFile = {
	charsets: Record<
		string,
		{ description: string; codePoints?: string[]; ranges?: [string, string][]; include?: string[] }
	>;
};

const charsetFile = readJson(resolve(specDir, "schema/charsets.json")) as CharsetFile;

const checkDigitFile = readJson(resolve(specDir, "schema/check-digits.json")) as {
	algorithms: Record<string, CheckDigitAlgorithm>;
};

/**
 * Expands a charset reference into sorted code point ranges.
 *
 * @param {string|string[]} names - One charset name, or the union of several.
 * @returns {CharsetRanges} The single code points and the ranges the union covers.
 */
export const resolveCharset = (names: string | string[]): CharsetRanges => {
	const wanted = Array.isArray(names) ? names : [names];
	const single = new Set<number>();
	const ranges: [number, number][] = [];

	const visit = (name: string): void => {
		const charset = charsetFile.charsets[name];

		if (charset === undefined) throw new Error(`unknown charset: ${name}`);

		for (const codePoint of charset.codePoints ?? []) single.add(Number.parseInt(codePoint, 16));
		for (const [from, to] of charset.ranges ?? [])
			ranges.push([Number.parseInt(from, 16), Number.parseInt(to, 16)]);
		for (const included of charset.include ?? []) visit(included);
	};

	for (const name of wanted) visit(name);

	return {
		single: [...single].sort((a, b) => a - b),
		ranges: ranges.sort((a, b) => a[0] - b[0]),
	};
};

/**
 * Looks a check digit algorithm up by name.
 *
 * @param {string} name - The algorithm name declared in `spec/schema/check-digits.json`.
 * @returns {CheckDigitAlgorithm} The algorithm.
 */
export const checkDigitAlgorithm = (name: string): CheckDigitAlgorithm => {
	const algorithm = checkDigitFile.algorithms[name];

	if (algorithm === undefined) throw new Error(`unknown check digit algorithm: ${name}`);

	return algorithm;
};

/**
 * Loads one utility spec.
 *
 * @param {string} id - The utility id, which is also its file name.
 * @returns {UtilitySpec} The spec.
 */
export const loadUtility = (id: string): UtilitySpec =>
	readJson(resolve(specDir, `utilities/${id}.json`)) as UtilitySpec;

/**
 * Loads every utility the specification covers, in declaration order.
 *
 * @returns {UtilitySpec[]} The specs.
 */
export const loadAll = (): UtilitySpec[] =>
	(readJson(resolve(specDir, "utilities.json")) as { utilities: string[] }).utilities.map((id) =>
		loadUtility(id),
	);

export const specRoot = specDir;
export const codegenRoot = dirname(resolve(import.meta.dirname, "emit.ts"));
