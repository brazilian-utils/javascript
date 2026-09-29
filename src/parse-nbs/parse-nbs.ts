import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { LENGTH } from "./constants";

/**
 * Removes NBS (Nomenclatura Brasileira de Serviços, Intangíveis e Outras Operações que Produzam
 * Variações no Patrimônio) formatting characters and returns only digits.
 *
 * A complete code has 9 digits, which is the length the result is capped at; a shorter value
 * (a chapter, a position or a subposition still being typed) passes through as far as it goes.
 * Every NBS code starts with 1, so nothing is ever padded here. Use `getNbs` or `isValidNbs` to
 * look a code up in the official table.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The NBS code to be parsed.
 * @returns {string} Up to 9 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseNbs("1.0101.11.00"); // "101011100"
 * parseNbs("1.0101.11.00999"); // "101011100" (capped to 9 digits)
 * parseNbs(1.5); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.gov.br/mdic/pt-br/assuntos/sdic/comercio-e-servicos/nbs-nomenclatura-brasileira-de-servicos
 * The NBS page of the MDIC: NBS 2.0, whose codes are printed as `N.NNNN.NN.NN`.
 */
export const parseNbs = (value: string | number): string =>
	isLookupCode(value) ? sanitizeToDigits(value).slice(0, LENGTH) : "";
