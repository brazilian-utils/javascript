import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * The two halves a generated lookup table is shipped as: its codes, which a validator bundles on
 * their own, and the descriptions aligned with them by index, which only a getter bundles.
 */
export type LookupTable<T> = {
	/** Every code, in ascending order. */
	codes: string[];
	/** The description of each code, at the index of that code. */
	descriptions: T[];
};

/**
 * Splits a record into its codes in ascending order and the descriptions aligned with them.
 * @param {Record<string, T>} data - The descriptions, keyed by code.
 * @returns {LookupTable<T>} The codes and the descriptions in the same order.
 */
export const splitRecord = <T>(data: Record<string, T>): LookupTable<T> => {
	const codes = Object.keys(data).sort();

	return { codes, descriptions: codes.map((code) => data[code]) };
};

/**
 * Packs ascending numeric codes of one fixed width into the text `findCodeIndex` reads: the width,
 * a colon, then each code as its difference from the one before it (the first from zero), in base
 * 36 and separated by commas. The differences of a dense table are one or two characters where the
 * codes are six to nine digits, so the table ships about a third of the bytes it would as the codes
 * written back to back.
 * @param {string[]} codes - The codes, in ascending order, every one the same number of digits.
 * @returns {string} The packed table, e.g. `"3:1,2,1"` for `["001", "003", "004"]`.
 */
export const packCodes = (codes: readonly string[]): string => {
	const [first = ""] = codes;

	if (first === "" || codes.some((code) => code.length !== first.length || !/^\d+$/.test(code))) {
		throw new Error("lookup table codes are not all digits of one width");
	}

	let previous = 0;
	const differences = codes.map((code, index) => {
		const value = Number(code);

		if (index > 0 && value <= previous) {
			throw new Error(`lookup table code ${code} is out of order or repeated`);
		}

		const difference = (value - previous).toString(36);
		previous = value;

		return difference;
	});

	return `${first.length}:${differences.join(",")}`;
};

/**
 * Writes codes of one fixed width as the source of a single string literal that holds them
 * packed by `packCodes`, which `findCodeIndex` reads. Each difference sits on a line of its own,
 * ended by a line continuation that adds nothing to the value, so a refresh diffs to the codes
 * that changed (and the one after each).
 * @param {string[]} codes - The codes, in ascending order.
 * @returns {string} The string literal.
 */
export const serializeCodes = (codes: readonly string[]): string =>
	`"${packCodes(codes).replaceAll(",", ",\\\n")}"`;

/**
 * Packs texts into the text `unpackTexts` reads (`src/_internals/unpack-texts`): one text per
 * line, each written as the number of leading characters it shares with the text before it, in
 * base 36 and capped at 35 (`0` for the first), then the rest of it. The descriptions of a
 * lookup table often start like the one before, so the start is written once.
 * @param {readonly string[]} texts - The texts, in the order they are read back in.
 * @returns {string} The packed texts.
 */
export const packTexts = (texts: readonly string[]): string => {
	let previous = "";

	return texts
		.map((text) => {
			if (text.includes("\n")) throw new Error(`text ${JSON.stringify(text)} has a line break`);

			let shared = 0;

			while (shared < 35 && shared < text.length && text[shared] === previous[shared]) shared += 1;

			previous = text;

			return `${shared.toString(36)}${text.slice(shared)}`;
		})
		.join("\n");
};

/**
 * Writes texts as the source of a single string literal that holds them packed by `packTexts`,
 * which `unpackTexts` reads. Each text sits on a line of its own, ended by a line continuation
 * that adds nothing to the value, so a refresh diffs to the texts that changed (and the one after
 * each).
 * @param {readonly string[]} texts - The texts.
 * @returns {string} The string literal.
 */
export const serializeTexts = (texts: readonly string[]): string => {
	const lines = packTexts(texts)
		.split("\n")
		.map((line) => JSON.stringify(line).slice(1, -1));

	return `"${lines.join("\\n\\\n")}"`;
};

/**
 * Writes lines of text as the source of a single string literal that holds them one per line.
 * Each sits on a line of its own, ended by a line continuation that adds nothing to the value, so
 * a refresh diffs to the lines that changed.
 * @param {readonly string[]} lines - The lines, none of them holding a line break.
 * @returns {string} The string literal.
 */
export const serializeLines = (lines: readonly string[]): string => {
	const escaped = lines.map((line) => JSON.stringify(line).slice(1, -1));

	return `"${escaped.join("\\n\\\n")}"`;
};

/**
 * Writes items of one fixed width as the source of a single string literal that holds them one
 * after the other. Each sits on a line of its own, ended by a line continuation that adds nothing
 * to the value, so a refresh diffs to the items that changed.
 * @param {readonly string[]} items - The items, every one the same number of characters.
 * @returns {string} The string literal.
 */
export const serializeFixedWidth = (items: readonly string[]): string => {
	const [first = ""] = items;

	if (items.some((item) => item.length !== first.length || /["\\\n]/.test(item))) {
		throw new Error("fixed width items are not all of one width, or hold a reserved character");
	}

	return `"${items.join("\\\n")}"`;
};

/**
 * Writes every generated file of a dataset, relative to the repository root.
 * @param {Record<string, string>} files - The content of each file, by its path.
 */
export const writeGeneratedFiles = async (files: Record<string, string>): Promise<void> => {
	await Promise.all(
		Object.entries(files).map(([path, content]) =>
			writeFile(resolve(import.meta.dirname, "..", path), content),
		),
	);
};

/**
 * Runs a generator's `main` when its script is the one `node` was started with, and not when a
 * module imports the script for its render function; a failure is printed and exits with 1.
 * @param {string} filename - The `import.meta.filename` of the script.
 * @param {() => Promise<void>} main - What the script does when it is run.
 */
export const runAsEntryPoint = async (
	filename: string,
	main: () => Promise<void>,
): Promise<void> => {
	if (process.argv[1] !== filename) return;

	await main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
};
