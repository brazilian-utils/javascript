import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Formats an NBS (Nomenclatura Brasileira de Serviços, Intangíveis e Outras Operações que
 * Produzam Variações no Patrimônio) code into the `N.NNNN.NN.NN` mask the nomenclature prints.
 *
 * This is a purely structural transformation, it does not check the code against the official
 * table, use `isValidNbs` for that. Like every formatter of this package, the value is read for
 * its digits and masked as far as they go, so a partial code still being typed is masked
 * progressively, characters outside the mask are dropped and anything without a digit gives
 * `""` instead of throwing. Every NBS code starts with 1, so there is no zero padding to offer.
 *
 * @param {string|number} value - The NBS code to be formatted.
 * @returns {string} The formatted code in the `N.NNNN.NN.NN` pattern, or an empty string when
 * there is nothing to format.
 *
 * @example
 * ```typescript
 * formatNbs("101011100"); // "1.0101.11.00"
 * formatNbs(101011100); // "1.0101.11.00"
 * formatNbs("10101"); // "1.0101" (partial values are masked as far as they go)
 * ```
 *
 * @see Official: https://www.gov.br/mdic/pt-br/images/REPOSITORIO/scs/decos/NBS/Anexoa_Ia_NBSa_2.0a_coma_alteraa_esa_6.12.18.pdf
 * Anexo I of the Portaria Conjunta RFB/SCS 2.000/2018, NBS 2.0: "Formação do código da NBS" and
 * the `N.NNNN.NN.NN` form every code of the nomenclature is printed in.
 */
export const formatNbs = (value: string | number): string =>
	isNullish(value) ? "" : format({ value: sanitizeToDigits(value), pattern: "0.0000.00.00" });
