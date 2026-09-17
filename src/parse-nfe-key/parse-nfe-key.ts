import { NFE_KEY_LENGTH, XML_ID_PREFIX_REGEX } from "../_internals/constants/nfe-key";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { toStringSafe } from "../_internals/to-string-safe/to-string-safe";

/**
 * Removes the formatting of a DF-e (Documento Fiscal eletrônico) access key (chave de acesso) and
 * returns only digits.
 *
 * The `NFe`, `CTe`, `MDFe`, `BPe`, `NF3e` and `NFCom` prefixes the `Id` attribute of the
 * document's XML puts in front of the key are stripped before the digits are read, with any
 * whitespace around them, the same way `isValidNfeKey` accepts them. The prefix has to go first
 * because `NF3e` carries a digit of its own that is not part of the key.
 *
 * The result is capped at the 44 digits of an access key; a shorter value passes through as far
 * as it goes, so the grouping of a key still being typed can be stripped with it. Use
 * `isValidNfeKey` to check the key and `getNfeKeyInfo` to read its fields.
 *
 * @param {string|number} value - The access key value to be parsed.
 * @returns {string} Up to 44 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseNfeKey("3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458");
 * // "35170458716523000119550010000000121000123458"
 *
 * parseNfeKey("NFe35170458716523000119550010000000121000123458");
 * // "35170458716523000119550010000000121000123458"
 * ```
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf
 * Manual de Orientação do Contribuinte (MOC) NF-e, "chave de acesso", which fixes the 44 digits
 * and the `Id` attribute the prefixes come from.
 */
export const parseNfeKey = (value: string | number): string => {
	// Stryker disable next-line StringLiteral: whatever replaces the prefix is stripped again by sanitizeToDigits unless it carries a digit, and the mutant's literal carries none.
	const body = toStringSafe(value).trim().replace(XML_ID_PREFIX_REGEX, "");

	return sanitizeToDigits(body).slice(0, NFE_KEY_LENGTH);
};
