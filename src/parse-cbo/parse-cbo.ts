import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { LENGTH } from "./constants";

/**
 * Removes CBO (Classificação Brasileira de Ocupações) formatting characters and returns only
 * digits.
 *
 * An occupation code has 6 digits, which is the length the result is capped at; a shorter value
 * passes through as far as it goes and is never left padded, so the leading zero of a code such
 * as `010205` has to be written out. Use `getCbo` or `isValidCbo`, which do pad a bare numeric
 * code, to look an occupation up.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The CBO code to be parsed.
 * @returns {string} Up to 6 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseCbo("2124-05"); // "212405"
 * parseCbo(2124.05); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads/cbo2002-ocupacao.csv
 * The CBO 2002 occupation table, as published by the Ministério do Trabalho e Emprego.
 */
export const parseCbo = (value: string | number): string =>
	isLookupCode(value) ? sanitizeToDigits(value).slice(0, LENGTH) : "";
