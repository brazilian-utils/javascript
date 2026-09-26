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
 * Writes codes of one fixed width as the source of a single string literal that holds them back
 * to back, which `findCodeIndex` reads. Each code sits on a line of its own, ended by a line
 * continuation that adds nothing to the value, so a refresh diffs to the codes that changed.
 * @param {string[]} codes - The codes, in the order they are looked up in.
 * @returns {string} The string literal.
 */
export const serializeCodes = (codes: readonly string[]): string => {
	const [first = ""] = codes;

	if (first === "" || codes.some((code) => code.length !== first.length || !/^\w+$/.test(code))) {
		throw new Error("lookup table codes are not all word characters of one width");
	}

	return `"${codes.join("\\\n")}"`;
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
