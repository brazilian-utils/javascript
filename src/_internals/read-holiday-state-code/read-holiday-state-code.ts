import { type StateCode } from "../constants/states";
import { isStateCode } from "../is-state-code/is-state-code";

/**
 * Reads the `stateCode` option of the holiday and business day utils. The match is
 * case-insensitive and ignores leading and trailing whitespace, like the other state utils.
 *
 * `undefined` stands for "no state": only the national holidays apply. Any other value that is
 * not the code of a Brazilian state (an unknown string such as `"XX"`, an empty string, a
 * prototype-chain key such as `"__proto__"`, or a value that is not a string at all) is rejected
 * with `null`, which each util turns into its own rejection (`[]`, `false` or `null`).
 *
 * @param {unknown} value - The `stateCode` option as the caller passed it.
 * @returns {StateCode|undefined|null} The state code, `undefined` for no state, or `null` when
 * the value is not a state code.
 *
 * @example
 * ```typescript
 * readHolidayStateCode(" sp "); // "SP"
 * readHolidayStateCode(undefined); // undefined
 * readHolidayStateCode("XX"); // null
 * readHolidayStateCode(""); // null
 * ```
 */
export const readHolidayStateCode = (value: unknown): StateCode | undefined | null => {
	if (value === undefined) return undefined;

	if (typeof value !== "string") return null;

	const normalized = value.trim().toUpperCase();

	return isStateCode(normalized) ? normalized : null;
};
