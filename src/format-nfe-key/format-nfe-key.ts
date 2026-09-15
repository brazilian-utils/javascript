import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { PATTERN } from "./constants";

/** Options of `formatNfeKey`. */
export type FormatNfeKeyOptions = {
	/** Whether to left pad the value with zeros up to the 44 digits of a complete access key (default: `false`). */
	pad?: boolean;
};

/**
 * Formats a DF-e (Documento Fiscal eletrônico) access key (chave de acesso) into groups of 4
 * digits separated by spaces, the form every auxiliary document prints it in: the DANFE of the
 * NF-e and the NFC-e, the DACTE of the CT-e, the CT-e OS and the GTV-e, the DAMDFE of the
 * MDF-e, the DABPE of the BP-e, the DANF3E of the NF3e and the DANFE-COM of the NFCom.
 *
 * Like every formatter of this package, the value is read for its digits and grouped as far as
 * they go, so a masked or partial key still being typed is grouped progressively and anything
 * without a digit (an object, `true`, an object with a null prototype) gives `""` instead of
 * throwing. Use `isValidNfeKey` to check a key.
 *
 * With `pad: true` the value is first left padded with zeros to the 44 digits of a complete
 * access key, so it always comes back fully grouped (`"12345"` gives
 * `"0000 0000 0000 0000 0000 0000 0000 0000 0000 0001 2345"`).
 *
 * The parameter is typed as a string because the 44 digits of an access key are more than a
 * JavaScript number can hold exactly. At runtime a number is read as the string of its digits,
 * like in every formatter of this package.
 *
 * @param {string} value - The access key value to be formatted.
 * @param {FormatNfeKeyOptions} [options] - Optional formatting options.
 * @param {boolean} [options.pad] - Whether to pad the value with leading zeros. Defaults to `false`.
 * @returns {string} The formatted access key, e.g. "3520 0612 3456 ...".
 *
 * @example
 * ```typescript
 * formatNfeKey("35170458716523000119550010000000121000123458");
 * // "3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458"
 *
 * formatNfeKey("12345"); // "1234 5" (partial values are grouped as far as they go)
 *
 * formatNfeKey("12345", { pad: true });
 * // "0000 0000 0000 0000 0000 0000 0000 0000 0000 0001 2345"
 * ```
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf
 * Manual de Orientação do Contribuinte (MOC) NF-e, "chave de acesso".
 */
export const formatNfeKey = (value: string, options?: FormatNfeKeyOptions): string =>
	isNullish(value)
		? ""
		: format({ pad: options?.pad, value: sanitizeToDigits(value), pattern: PATTERN });
