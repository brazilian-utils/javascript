import { format } from "../_internals/format/format";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { PATTERN } from "./constants";

/**
 * Formats a DF-e (Documento Fiscal eletrônico) access key (chave de acesso) into groups of 4
 * digits separated by spaces, the form every auxiliary document prints it in: the DANFE of the
 * NF-e and the NFC-e, the DACTE of the CT-e, the CT-e OS and the GTV-e, the DAMDFE of the
 * MDF-e, the DABPE of the BP-e, the DANF3E of the NF3e and the DANFE-COM of the NFCom.
 *
 * Anything that is not a string is only read when it is a non-negative safe integer, so a value
 * with no usable digit representation (a negative or fractional number, an object, a value with
 * a null prototype) gives `""` instead of throwing.
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
	isLookupCode(value) ? format({ value: sanitizeToDigits(value), pattern: PATTERN }) : "";
