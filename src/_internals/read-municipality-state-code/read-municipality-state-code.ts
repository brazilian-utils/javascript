import { IBGE_UF_CODES } from "../constants/ibge-uf-codes";
import { type StateCode } from "../constants/states";
import { hasOwnKey } from "../has-own-key/has-own-key";

/**
 * Reads the state a municipality belongs to off its IBGE code: the first two digits of a
 * municipality code are the IBGE code of its state.
 *
 * @param {string} digits - The digits of a municipality code.
 * @returns {StateCode | null} The state, or `null` when the first two digits are not the code of
 * a state.
 *
 * @example
 * ```typescript
 * readMunicipalityStateCode("3550308"); // "SP"
 * readMunicipalityStateCode("9950308"); // null
 * ```
 */
export const readMunicipalityStateCode = (digits: string): StateCode | null => {
	const prefix = digits.slice(0, 2);

	return hasOwnKey(IBGE_UF_CODES, prefix) ? IBGE_UF_CODES[prefix] : null;
};
