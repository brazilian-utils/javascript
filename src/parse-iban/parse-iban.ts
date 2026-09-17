import { BR_IBAN_LENGTH } from "../_internals/constants/iban";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";

/**
 * Removes IBAN formatting characters, uppercases the result and returns the compact IBAN.
 *
 * An IBAN carries letters as well as digits (the country code, the account type and, from the
 * tenth holder on, the owner indicator), so the value is read for its letters and digits rather
 * than for its digits alone, exactly like `parsePassport` and `formatIban` do. The result is
 * capped at the 29 characters of a Brazilian IBAN, the same cap `formatIban` applies, and a
 * shorter value passes through as far as it goes. Use `isValidIban` to check the check digits and
 * `getIbanInfo` to read the fields.
 *
 * @param {string|number} value - The IBAN to be parsed.
 * @returns {string} Up to 29 uppercase alphanumeric characters, or an empty string when there is
 * no letter or digit at all.
 *
 * @example
 * ```typescript
 * parseIban("BR15 0000 0000 0000 1093 2840 814P 2"); // "BR1500000000000010932840814P2"
 * ```
 *
 * @see Official: https://www.bcb.gov.br/pre/normativos/circ/2013/pdf/circ_3625_v1_O.pdf
 * Circular BCB nº 3.625/2013
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/Documents/sistema_pagamentos_brasileiro/IBAN-Guidelines_%20port.pdf
 * Diretrizes de Implementação do IBAN no Brasil, which fix the 29 character Brazilian length.
 */
export const parseIban = (value: string | number): string =>
	isNullish(value) ? "" : sanitizeToAlphanumeric(value).slice(0, BR_IBAN_LENGTH);
