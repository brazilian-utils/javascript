import { BR_IBAN_REGEX, IBAN_FORMAT_REGEX } from "../_internals/constants/iban";
import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";

const LETTER_CODE_A = 65;
const LETTER_OFFSET = 55;

const hasValidCheckDigits = (iban: string): boolean => {
	const rearranged = iban.slice(4) + iban.slice(0, 4);

	let numeric = "";

	for (let i = 0; i < rearranged.length; i++) {
		const code = rearranged.charCodeAt(i);
		numeric += code >= LETTER_CODE_A ? String(code - LETTER_OFFSET) : rearranged[i];
	}

	return BigInt(numeric) % 97n === 1n;
};

/**
 * Validates a Brazilian IBAN (International Bank Account Number).
 *
 * Only Brazilian IBANs (country code `BR`) are recognized: the field layout of the other 90+
 * ISO 13616 countries is out of scope, so any non `BR` IBAN, however well formed, returns
 * `false`. Accepts the usual grouping mask and is case-insensitive.
 *
 * Both accepted forms are the ones an IBAN is written in: compact,
 * `"BR1500000000000010932840814P2"`, or the ISO 13616 print format, letters and digits in groups
 * of 4 (the last one shorter), with optional surrounding whitespace either way. The groups may be
 * split by whitespace, `.`, `-` or `/`, the interchangeable mask characters `isValidCpf` and
 * `isValidCnpj` accept, so `"BR1500000000000010932840814P-2"` reads as the same IBAN. Only a
 * separator away from a group boundary, a run of separators (ISO 13616 prints a single one) or a
 * character outside letters and digits makes the value something other than an IBAN, so
 * `"BR15 0000 0000 0000 1093 2840  814P 2"` and `"BR15 000 00000 0000 1093 2840 814P 2"` are
 * rejected instead of having the offending character stripped.
 *
 * The last character is the owner indicator, `1` for the first or only holder up to `9` for the
 * ninth and then `A` to `Z` from the tenth, per Circular BCB nº 3.625/2013 art. 2º § 1º, so a
 * value ending in `0` is rejected.
 *
 * @param {string} value - The IBAN to be validated.
 * @returns {boolean} True when `value` is a structurally valid Brazilian IBAN whose ISO 7064
 * MOD 97-10 check digits match.
 *
 * @example
 * ```typescript
 * isValidIban("BR1500000000000010932840814P2"); // true
 * isValidIban("BR15 0000 0000 0000 1093 2840 814P 2"); // true (grouping spaces)
 * isValidIban("BR15-0000-0000-0000-1093-2840-814P-2"); // true (any of the mask characters)
 * isValidIban("br1500000000000010932840814p2"); // true (case-insensitive)
 * isValidIban("BR1500000000000010932840814P3"); // false (bad check digits)
 * isValidIban("BR15 000 00000 0000 1093 2840 814P 2"); // false (a separator inside a group)
 * isValidIban("DE89370400440532013000"); // false (non Brazilian IBAN)
 * ```
 *
 * @see Official: https://www.bcb.gov.br/pre/normativos/circ/2013/pdf/circ_3625_v1_O.pdf
 * Circular BCB nº 3.625/2013
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/Documents/sistema_pagamentos_brasileiro/IBAN-Guidelines_%20port.pdf
 * Diretrizes de Implementação do IBAN no Brasil
 * @see Official: https://www.iso.org/standard/81090.html
 * ISO 13616-1:2020 (IBAN structure)
 * @see Official: https://www.iso.org/standard/31531.html
 * ISO/IEC 7064:2003 (MOD 97-10 check digit algorithm)
 * @see Based on: https://www.iban.com/structure
 * Used to cross check the Brazil IBAN example.
 */
export const isValidIban = (value: string): boolean => {
	if (typeof value !== "string") return false;

	const printed = value.trim();

	if (!IBAN_FORMAT_REGEX.test(printed)) return false;

	const sanitized = sanitizeToAlphanumeric(printed);

	if (!BR_IBAN_REGEX.test(sanitized)) return false;

	return hasValidCheckDigits(sanitized);
};
