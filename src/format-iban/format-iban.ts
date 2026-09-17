import { BR_IBAN_LENGTH } from "../_internals/constants/iban";
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
 * format, or a partial value still being typed. Like every formatter of this package, it is read
 * for its letters and digits and grouped as far as they go: any other character (a hyphen, a
 * dot, extra whitespace) is dropped and the letters are uppercased. Only a value that is not a
 * string gives an empty string.
 *
 * @param {string} value - The IBAN to be formatted.
 * @returns {string} The IBAN uppercased and grouped in blocks of 4 characters, or an empty
 * string when `value` is not a string.
 *
 * @example
 * ```typescript
 * formatIban("BR1500000000000010932840814P2"); // "BR15 0000 0000 0000 1093 2840 814P 2"
 * formatIban("br1500000000000010932840814p2"); // "BR15 0000 0000 0000 1093 2840 814P 2"
 * formatIban("BR15"); // "BR15"
 * formatIban("BR1500000000000010932840814P2EXTRA"); // "BR15 0000 0000 0000 1093 2840 814P 2"
 * formatIban("BR15 0000-0000.0000/1093 2840 814P-2"); // "BR15 0000 0000 0000 1093 2840 814P 2"
 * ```
 *
 * @see Official: https://www.bcb.gov.br/pre/normativos/circ/2013/pdf/circ_3625_v1_O.pdf
 * Circular BCB nº 3.625/2013
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/Documents/sistema_pagamentos_brasileiro/IBAN-Guidelines_%20port.pdf
 * Diretrizes de Implementação do IBAN no Brasil
 */
export const formatIban = (value: string): string => {
	if (typeof value !== "string") return "";

	const sanitized = sanitizeToAlphanumeric(value).slice(0, BR_IBAN_LENGTH);

	let formatted = "";

	for (let i = 0; i < sanitized.length; i++) {
		if (i > 0 && i % GROUP_SIZE === 0) formatted += " ";
		formatted += sanitized[i];
	}

	return formatted;
};
