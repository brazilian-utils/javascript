import { STATE_CODES } from "../constants/state-codes";
import { type StateCode } from "../constants/states";

/**
 * Checks whether a value is the two letter code of a Brazilian state, as published by the IBGE.
 *
 * The check is exact: the value has to be already trimmed and in upper case, and a key of the
 * prototype chain (`"constructor"`) is no state code like any other unknown value.
 *
 * @param {string} value - The value to check.
 * @returns {boolean} True when the value is one of the 27 state codes.
 *
 * @example
 * ```typescript
 * isStateCode("SP"); // true
 * isStateCode("sp"); // false
 * isStateCode("XX"); // false
 * ```
 */
export const isStateCode = (value: string): value is StateCode =>
	STATE_CODES.some((code) => code === value);
