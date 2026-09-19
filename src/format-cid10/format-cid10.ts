import { format } from "../_internals/format/format";
import { parseCid10 } from "../parse-cid10/parse-cid10";

/**
 * Formats a CID-10 (Classificação Internacional de Doenças, 10th revision) code the way it is
 * printed: upper case, with a dot between the 3 character category and the fourth character of
 * the subcategory.
 *
 * This is a purely structural transformation, it does not check the code against the official
 * table, use `isValidCid10` for that. The mask is applied progressively, as far as the value
 * goes, which is what an input being typed into needs: a category stays as it is (`"A00"`) and
 * the dot only shows up with the fourth character. Characters outside the mask are dropped and
 * the value is capped at the 4 characters of a subcategory.
 *
 * @param {string} value - The CID-10 code to be formatted.
 * @returns {string} The formatted code in the `A00.0` pattern, or an empty string when there is
 * nothing to format or the value is not a string.
 *
 * @example
 * ```typescript
 * formatCid10("A000"); // "A00.0"
 * formatCid10("f322"); // "F32.2"
 * formatCid10("A00"); // "A00" (a category has no dot)
 * formatCid10("A00.0"); // "A00.0"
 * ```
 *
 * @see Official: http://www2.datasus.gov.br/cid10/V2008/descrcsv.htm
 * The DATASUS description of the CID-10 tables: `SUBCAT` is the subcategory code without the dot
 * and `DESCRABREV` prints it with the dot (`A00.0`).
 */
export const formatCid10 = (value: string): string =>
	format({ value: parseCid10(value), pattern: "000.0" });
