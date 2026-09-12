import { getCbo } from "../get-cbo/get-cbo";

/**
 * Validates if a CBO (Classificação Brasileira de Ocupações) code exists in the official
 * CBO 2002 table.
 *
 * @param {string|number} value - The CBO code to be validated, with or without the hyphen
 * mask, e.g. `"2124-05"`, `"212405"` or `212405`.
 * @returns {boolean} True when the code is a known 6 digit occupation code, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCbo("2124-05"); // true
 * isValidCbo("212405"); // true
 * isValidCbo(212405); // true
 * isValidCbo(10205); // true (a number is padded to 6 digits, so this is "010205")
 * isValidCbo("999999"); // false
 * ```
 *
 * @see Official: http://www.mtecbo.gov.br/cbosite/pages/downloads.jsf
 * @see Based on: https://raw.githubusercontent.com/lucaashoff/lista-cbo-json/main/cbos.json
 * Community mirror of the official table used to build `CBO_TITLES`.
 */
export const isValidCbo = (value: string | number): boolean => getCbo(value) !== null;
