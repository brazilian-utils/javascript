import { NFE_KEY_ALPHANUMERIC_END, NFE_KEY_ALPHANUMERIC_START } from "../constants/nfe-key";
import { sanitizeToAlphanumeric } from "../sanitize-to-alphanumeric/sanitize-to-alphanumeric";

/**
 * Sanitizes a DF-e access key (chave de acesso) to the characters it is written with: digits
 * everywhere, and the upper cased letters of an alphanumeric CNPJ in positions 7 to 18, the only
 * ones `TChNFe` (`[0-9]{6}[0-9A-Z]{12}[0-9]{26}`) opens to letters. A letter that falls anywhere
 * else is dropped like any other character outside the key, so the positions are counted on the
 * characters kept. The result is not capped: the caller cuts it to the 44 characters of a key.
 *
 * Shared by `formatNfeKey` and `parseNfeKey`, which read a value the very same way.
 *
 * @param {string|number} value - The access key value to sanitize.
 * @returns {string} The sanitized value.
 *
 * @example
 * ```typescript
 * sanitizeNfeKey("3526 0712 abc3 4501 DE35"); // "35260712ABC34501DE35"
 * sanitizeNfeKey("NFe352607"); // "352607", the letters before position 7 are dropped
 * ```
 */
export const sanitizeNfeKey = (value: string | number): string => {
	let key = "";

	for (const character of sanitizeToAlphanumeric(value)) {
		if (
			/\d/.test(character) ||
			(key.length >= NFE_KEY_ALPHANUMERIC_START && key.length < NFE_KEY_ALPHANUMERIC_END)
		) {
			key += character;
		}
	}

	return key;
};
