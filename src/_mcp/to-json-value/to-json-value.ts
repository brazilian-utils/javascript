import { isValidDate } from "../../_internals/is-valid-date/is-valid-date";

const toCalendarDate = (date: Date): string =>
	[
		String(date.getFullYear()).padStart(4, "0"),
		String(date.getMonth() + 1).padStart(2, "0"),
		String(date.getDate()).padStart(2, "0"),
	].join("-");

/**
 * Prepares a library result for `JSON.stringify`. A `Date` becomes its local calendar date
 * written as `YYYY-MM-DD`, the convention the date utilities build their results in, instead of
 * the UTC instant `Date#toJSON` writes, which names the previous day east of Greenwich. An
 * invalid `Date` and `undefined` become `null`; arrays and objects are copied recursively.
 *
 * @param {unknown} value - The value a library function returned.
 * @returns {unknown} The JSON ready copy.
 *
 * @example
 * ```typescript
 * toJsonValue({ name: "Ano novo", date: new Date(2024, 0, 1) });
 * // { name: "Ano novo", date: "2024-01-01" }
 * toJsonValue(undefined); // null
 * ```
 */
export const toJsonValue = (value?: unknown): unknown => {
	if (value === undefined) return null;
	if (value instanceof Date) return isValidDate(value) ? toCalendarDate(value) : null;
	if (Array.isArray(value)) return value.map((item) => toJsonValue(item));
	if (typeof value === "object" && value !== null) {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]): [string, unknown] => [key, toJsonValue(item)]),
		);
	}

	return value;
};
