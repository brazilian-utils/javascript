import { type StateCode } from "../constants/states";
import { isStateCode } from "../is-state-code/is-state-code";

/**
 * Reads a state code given by a caller: a string that, once its surrounding whitespace is removed
 * and its letters are upper cased, is the two letter code of a Brazilian state. Anything else (an
 * unknown string such as `"XX"`, an empty string, a prototype-chain key such as `"__proto__"`, a
 * value that is not a string) is `null`, so the caller decides what an unknown state means.
 *
 * @param {unknown} value - The state code as the caller passed it.
 * @returns {StateCode|null} The state code, or `null` when the value is not one.
 *
 * @example
 * ```typescript
 * readStateCode(" sp "); // "SP"
 * readStateCode("XX"); // null
 * readStateCode(35); // null
 * ```
 */
export const readStateCode = (value: unknown): StateCode | null => {
	if (typeof value !== "string") return null;

	const normalized = value.trim().toUpperCase();

	return isStateCode(normalized) ? normalized : null;
};
