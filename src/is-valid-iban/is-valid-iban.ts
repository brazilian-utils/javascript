import { BR_IBAN_LENGTH, BR_IBAN_REGEX } from "../_internals/constants/iban";
import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";

const LETTER_CODE_A = 65;
const LETTER_CODE_Z = 90;
const LETTER_OFFSET = 55;

const hasValidCheckDigits = (iban: string): boolean => {
	const rearranged = iban.slice(4) + iban.slice(0, 4);

	let numeric = "";

	for (let i = 0; i < rearranged.length; i++) {
		const code = rearranged.charCodeAt(i);
		numeric +=
			code >= LETTER_CODE_A && code <= LETTER_CODE_Z ? String(code - LETTER_OFFSET) : rearranged[i];
	}

	return BigInt(numeric) % 97n === 1n;
};

/**
 * Validates a Brazilian IBAN (International Bank Account Number).
 *
 * Only Brazilian IBANs (country code `BR`) are recognized: the field layout of the other 90+
 * ISO 13616 countries is out of scope, so any non `BR` IBAN, however well formed, returns
 * `false`. Accepts the usual grouping spaces and is case-insensitive.
 *
 * @param {string} value - The IBAN to be validated.
 * @returns {boolean} True when `value` is a structurally valid Brazilian IBAN whose ISO 7064
 * MOD 97-10 check digits match.
 *
 * @example
 * ```typescript
 * isValidIban("BR1500000000000010932840814P2"); // true
 * isValidIban("BR15 0000 0000 0000 1093 2840 814P 2"); // true (grouping spaces)
 * isValidIban("br1500000000000010932840814p2"); // true (case-insensitive)
 * isValidIban("BR1500000000000010932840814P3"); // false (bad check digits)
 * isValidIban("DE89370400440532013000"); // false (non Brazilian IBAN)
 * ```
 *
 * @see Official: https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Circular&numero=3625 Circular BCB nº 3.625/2013 (Diretrizes de Implementação do IBAN no Brasil)
 * @see Official: https://www.iso.org/standard/81090.html ISO/IEC 7064 (MOD 97-10 check digit algorithm)
 * @see Based on: https://www.iban.com/structure Used to cross check the Brazil IBAN example.
 */
export const isValidIban = (value: string): boolean => {
	if (typeof value !== "string" || value === "") return false;

	const sanitized = sanitizeToAlphanumeric(value);

	if (sanitized.length !== BR_IBAN_LENGTH) return false;
	if (!BR_IBAN_REGEX.test(sanitized)) return false;

	return hasValidCheckDigits(sanitized);
};
