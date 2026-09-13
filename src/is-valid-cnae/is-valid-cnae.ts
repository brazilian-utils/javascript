import { getCnae } from "../get-cnae/get-cnae";

/**
 * Validates if a CNAE (Classificação Nacional de Atividades Econômicas) subclass code
 * exists in the official CNAE-Subclasses 2.3 table, the current subclass revision of CNAE 2.0.
 *
 * A string is only read as a code when it is written in one of the documented forms: the 7
 * digits, or the `NNNN-N/NN` mask, with a single separator (space, `.`, `-` or `/`) between the groups and optional
 * surrounding whitespace. A number is only read as a code when it is a non-negative safe
 * integer.
 *
 * @param {string|number} value - The CNAE code to be validated, with or without the
 * `NNNN-N/NN` mask, e.g. `"6201-5/01"`, `"6201501"` or `6201501`.
 * @returns {boolean} True when the code is a known 7 digit subclass, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCnae("6201-5/01"); // true
 * isValidCnae("6201501"); // true
 * isValidCnae(6201501); // true
 * isValidCnae(111301); // true (a number is padded to 7 digits, so this is "0111301")
 * isValidCnae("0000000"); // false
 * isValidCnae("0111abc301"); // false (not a documented form)
 * isValidCnae(-111301); // false (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/v2/cnae/subclasses
 * @see Official: https://concla.ibge.gov.br/busca-online-cnae.html
 * CONCLA's CNAE search and structure browser, which publishes CNAE-Subclasses 2.3.
 */
export const isValidCnae = (value: string | number): boolean => getCnae(value) !== null;
