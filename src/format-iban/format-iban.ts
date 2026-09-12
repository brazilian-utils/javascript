import { BR_IBAN_LENGTH } from "../_internals/constants/iban";
import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";
import { GROUP_SIZE } from "./constants";

/**
 * Formats a Brazilian IBAN by grouping it in blocks of 4 characters, the ISO 13616 "print"
 * presentation used on statements and bank forms.
 *
 * Does not validate the check digits or the field layout; formats whatever is given, up to
 * the 29 character length of a Brazilian IBAN, as far as it goes, so the function can also be
 * used as an input mask. Use `isValidIban` to check validity.
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
 * ```
 *
 * @see Official: https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Circular&numero=3625 Circular BCB nº 3.625/2013 (Diretrizes de Implementação do IBAN no Brasil)
 */
export const formatIban = (value: string): string => {
	if (typeof value !== "string" || value === "") return "";

	const sanitized = sanitizeToAlphanumeric(value).slice(0, BR_IBAN_LENGTH);

	let formatted = "";

	for (let i = 0; i < sanitized.length; i++) {
		if (i > 0 && i % GROUP_SIZE === 0) formatted += " ";
		formatted += sanitized[i];
	}

	return formatted;
};
