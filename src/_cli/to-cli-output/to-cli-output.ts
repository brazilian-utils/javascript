import { CLI_EXIT_CODES } from "../constants";

/** What the command line prints for the value a utility returned. */
export type CliOutput = {
	/** The text written to stdout, without the trailing line break. */
	text: string;
	/** `1` when the value is `false`, `null`, `undefined` or the empty string, `0` otherwise. */
	exitCode: 0 | 1;
};

const toLocalDate = (date: Date): string => {
	const year = String(date.getFullYear()).padStart(4, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
};

const toPrintable = (value: unknown): unknown => {
	if (value instanceof Date) return toLocalDate(value);
	if (Array.isArray(value)) return value.map((item) => toPrintable(item));
	if (typeof value === "bigint" || typeof value === "symbol") return String(value);
	if (typeof value === "function") return String(value);
	if (typeof value !== "object" || value === null) return value;

	return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toPrintable(item)]));
};

/**
 * Renders the value a utility returned for the command line.
 *
 * A string is printed as it is, anything else as indented JSON (which prints a number or `true`
 * as they are too). A `Date`, alone or inside a result, is printed as its local calendar day
 * (`YYYY-MM-DD`), the way the date utilities of this library read one, instead of the UTC instant
 * `JSON.stringify` would write. The exit code is `1` for the three negative answers of the
 * library: `false` from a validator, `null` from a lookup and `""` from a formatter or a parser
 * that was given something it cannot read. The values JSON cannot hold (a bigint, a symbol, a
 * function) are printed as their text, so rendering never throws.
 *
 * @param {unknown} value - The value returned by the utility.
 * @returns {CliOutput} The text to print and the exit code.
 *
 * @example
 * ```typescript
 * toCliOutput("123.456.789-09"); // { text: "123.456.789-09", exitCode: 0 }
 * toCliOutput(false); // { text: "false", exitCode: 1 }
 * toCliOutput(null); // { text: "null", exitCode: 1 }
 * toCliOutput(""); // { text: "", exitCode: 1 }
 * toCliOutput(new Date(2024, 11, 25)); // { text: "2024-12-25", exitCode: 0 }
 * toCliOutput({ code: "001" }); // { text: '{\n  "code": "001"\n}', exitCode: 0 }
 * ```
 */
export const toCliOutput = (value: unknown): CliOutput => {
	if (value === undefined || value === null || value === false) {
		return { text: value === false ? "false" : "null", exitCode: CLI_EXIT_CODES.failure };
	}

	if (value === "") return { text: "", exitCode: CLI_EXIT_CODES.failure };

	const printable = toPrintable(value);
	const text = typeof printable === "string" ? printable : JSON.stringify(printable, null, 2);

	return { text, exitCode: CLI_EXIT_CODES.success };
};
