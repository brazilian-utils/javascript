import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { PATTERN } from "./constants";

/**
 * Formats a DF-e (NF-e, NFC-e, CT-e or MDF-e) access key (chave de acesso) into groups of 4
 * digits separated by spaces, the common display form printed on the DANFE.
 *
 * @param {string} value - The access key value to be formatted.
 * @returns {string} The formatted access key, e.g. "3520 0612 3456 ...".
 *
 * @example
 * ```typescript
 * formatNfeKey("35170458716523000119550010000000121000123458");
 * // "3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458"
 * ```
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf
 * Manual de Orientação do Contribuinte (MOC) NF-e, "chave de acesso".
 */
export const formatNfeKey = (value: string): string =>
	isNullish(value) ? "" : format({ value: sanitizeToDigits(value), pattern: PATTERN });
