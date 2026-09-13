import { BR_IBAN_LENGTH, IBAN_FORMAT_REGEX } from "../_internals/constants/iban";
import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";
import { GROUP_SIZE } from "./constants";

/**
 * Formats an IBAN in the ISO 13616 print grouping, blocks of 4 characters, the presentation
 * used on statements and bank forms.
 *
 * Does not validate the check digits or the field layout; formats whatever is given, up to
 * the 29 character length of a Brazilian IBAN, as far as it goes, so the function can also be
 * used as an input mask, and an IBAN of another country is grouped the same way up to that
 * length. Use `isValidIban` to check validity.
 *
 * The value may be compact (`"BR1500000000000010932840814P2"`), already in the ISO 13616 print
 * format (letters and digits in groups separated by a single space) or a partial value still
 * being typed, in every case with optional surrounding whitespace. Only a character outside
 * letters and digits, or a separator other than a single space, makes the value something
 * other than an IBAN, and then the function returns an empty string instead of quietly
 * dropping the character and presenting the rest as an IBAN.
 *
 * @param {string} value - The IBAN to be formatted.
 * @returns {string} The IBAN uppercased and grouped in blocks of 4 characters, or an empty
 * string when `value` is not a string written in the print format.
 *
 * @example
 * ```typescript
 * formatIban("BR1500000000000010932840814P2"); // "BR15 0000 0000 0000 1093 2840 814P 2"
 * formatIban("br1500000000000010932840814p2"); // "BR15 0000 0000 0000 1093 2840 814P 2"
 * formatIban("BR15"); // "BR15"
 * formatIban("BR1500000000000010932840814P2EXTRA"); // "BR15 0000 0000 0000 1093 2840 814P 2"
 * formatIban("BR1500000000000010932840814P-2"); // "" (hyphens are not part of an IBAN)
 * ```
 *
 * @see Official: https://www.bcb.gov.br/pre/normativos/circ/2013/pdf/circ_3625_v1_O.pdf Circular BCB nº 3.625/2013
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/Documents/sistema_pagamentos_brasileiro/IBAN-Guidelines_%20port.pdf Diretrizes de Implementação do IBAN no Brasil
 */
export const formatIban = (value: string): string => {
	if (typeof value !== "string") return "";

	const printed = value.trim();

	if (!IBAN_FORMAT_REGEX.test(printed)) return "";

	const sanitized = sanitizeToAlphanumeric(printed).slice(0, BR_IBAN_LENGTH);

	let formatted = "";

	for (let i = 0; i < sanitized.length; i++) {
		if (i > 0 && i % GROUP_SIZE === 0) formatted += " ";
		formatted += sanitized[i];
	}

	return formatted;
};
