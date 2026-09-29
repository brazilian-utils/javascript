import { format } from "../_internals/format/format";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/** Options of `formatNbs`. */
export type FormatNbsOptions = {
	/** Whether to left pad the value with zeros up to the 9 digits of a complete NBS code (default: `false`). */
	pad?: boolean;
};

/**
 * Formats an NBS (Nomenclatura Brasileira de Serviços, Intangíveis e Outras Operações que
 * Produzam Variações no Patrimônio) code into the `N.NNNN.NN.NN` mask the nomenclature prints.
 *
 * This is a purely structural transformation, it does not check the code against the official
 * table, use `isValidNbs` for that. Like every formatter of this package, a string is read for
 * its digits and masked as far as they go, so a partial code still being typed is masked
 * progressively, characters outside the mask are dropped and anything without a digit gives
 * `""` instead of throwing. A number is only read when it is a non-negative safe integer: its
 * sign and decimal point are not mask characters, so a negative, fractional, not finite or unsafe
 * number gives `""` too. With `pad: true` the value is first left padded with zeros to the 9
 * digits of a complete code, so it always comes back fully masked (`"1"` gives `"0.0000.00.01"`).
 * Every NBS code starts with 1, so the padding only serves a caller that wants a fixed width.
 *
 * @param {string|number} value - The NBS code to be formatted.
 * @param {FormatNbsOptions} [options] - Optional formatting options.
 * @param {boolean} [options.pad] - Whether to pad the value with leading zeros. Defaults to `false`.
 * @returns {string} The formatted code in the `N.NNNN.NN.NN` pattern, or an empty string when
 * there is nothing to format.
 *
 * @example
 * ```typescript
 * formatNbs("101011100"); // "1.0101.11.00"
 * formatNbs(101011100); // "1.0101.11.00"
 * formatNbs("10101"); // "1.0101" (partial values are masked as far as they go)
 * formatNbs("1", { pad: true }); // "0.0000.00.01" (padded to 9 digits first)
 * formatNbs(-101011100); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.gov.br/mdic/pt-br/images/REPOSITORIO/scs/decos/NBS/Anexoa_Ia_NBSa_2.0a_coma_alteraa_esa_6.12.18.pdf
 * Anexo I of the Portaria Conjunta RFB/SCS 2.000/2018, NBS 2.0: "Formação do código da NBS" and
 * the `N.NNNN.NN.NN` form every code of the nomenclature is printed in.
 */
export const formatNbs = (value: string | number, options?: FormatNbsOptions): string =>
	isLookupCode(value)
		? format({ pad: options?.pad, value: sanitizeToDigits(value), pattern: "0.0000.00.00" })
		: "";
