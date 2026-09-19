import { type CliValueKind } from "../constants";

const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

const toDate = (value: string): Date => {
	const match = ISO_DATE_REGEX.exec(value);
	if (match === null) return new Date(Number.NaN);

	const month = Number(match[2]) - 1;
	const date = new Date(0);

	date.setFullYear(Number(match[1]), month, Number(match[3]));
	date.setHours(0, 0, 0, 0);

	return date.getMonth() === month ? date : new Date(Number.NaN);
};

const toBoolean = (value: string): boolean | string => {
	if (value === "true") return true;
	if (value === "false") return false;
	return value;
};

/**
 * Turns the text of a command line argument into the value a utility expects.
 *
 * Only text is converted: a value that already has a type (a bare `--flag`, anything that came
 * from `--json`) is handed back untouched, and so is text with no kind, which stays a string so
 * that codes such as `"001"` keep their leading zeros. Text that does not spell its kind becomes
 * the invalid value of that kind (`NaN`, an invalid `Date`), which every utility already answers
 * with `false`, `null` or `""` instead of throwing.
 *
 * A date is written `YYYY-MM-DD` and means that local calendar day, the way the date utilities of
 * this library read a `Date`. A day that does not exist (`2024-02-30`, month `13`) rolls over into
 * another month when it is set, which is how it is told apart and made an invalid `Date`.
 *
 * @param {unknown} value - The argument, as written on the command line or read from `--json`.
 * @param {CliValueKind | "text"} [kind] - The kind the utility expects. Text stays text without one.
 * @returns {unknown} The converted value.
 *
 * @example
 * ```typescript
 * coerceCliValue("001"); // "001"
 * coerceCliValue("2", "number"); // 2
 * coerceCliValue("abc", "number"); // NaN
 * coerceCliValue("2024-12-25", "date"); // new Date(2024, 11, 25)
 * coerceCliValue("cpf, cnpj", "list"); // ["cpf", "cnpj"]
 * coerceCliValue("false", "boolean"); // false
 * coerceCliValue(3, "number"); // 3
 * ```
 */
export const coerceCliValue = (value: unknown, kind?: CliValueKind | "text"): unknown => {
	if (typeof value !== "string") return value;

	if (kind === "boolean") return toBoolean(value);
	if (kind === "date") return toDate(value);
	if (kind === "list") return value.split(",").map((item) => item.trim());
	if (kind === "number") return value.trim() === "" ? Number.NaN : Number(value);

	return value;
};
