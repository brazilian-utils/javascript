import { CID10_LENGTH } from "../_internals/constants/cid10";
import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";

/**
 * Removes CID-10 (Classificação Internacional de Doenças, 10th revision) formatting characters
 * and returns the upper case code without the dot, the form the DATASUS tables store.
 *
 * This is a purely structural transformation: a subcategory has 4 characters, which is the
 * length the result is capped at, and a shorter value (a category, or a code still being typed)
 * passes through as far as it goes. It does not check the code against the official table, use
 * `isValidCid10` for that.
 *
 * @param {string} value - The CID-10 code to be parsed.
 * @returns {string} Up to 4 upper case letters and digits, or an empty string when there is none
 * or the value is not a string.
 *
 * @example
 * ```typescript
 * parseCid10("A00.0"); // "A000"
 * parseCid10("f32.2"); // "F322"
 * parseCid10("A00"); // "A00"
 * ```
 *
 * @see Official: http://www2.datasus.gov.br/cid10/V2008/descrcsv.htm
 * The DATASUS description of the CID-10 tables: `SUBCAT` is the subcategory code "sem incluir
 * ponto".
 */
export const parseCid10 = (value: string): string =>
	typeof value === "string" ? sanitizeToAlphanumeric(value).slice(0, CID10_LENGTH) : "";
