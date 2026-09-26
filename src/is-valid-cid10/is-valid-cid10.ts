import { CID10_SUBCATEGORIES } from "../_internals/constants/cid10";
import { normalizeCid10 } from "../_internals/normalize-cid10/normalize-cid10";

const CATEGORY_LENGTH = 3;

/**
 * Validates if a CID-10 (Classificação Internacional de Doenças, 10th revision) code exists in
 * the Brazilian Portuguese tables DATASUS publishes.
 *
 * Both levels of the classification are valid: the 3 character categories (`A00`) and the 4
 * character subcategories, written with the dot medical certificates print (`A00.0`) or without
 * it, the form the DATASUS tables store (`A000`). Letter case and surrounding whitespace are
 * ignored. Anything else (`"A00-0"`, `"A00.00"`, a dagger or asterisk suffix, a value that is
 * not a string) is rejected.
 *
 * The check reads a table of codes only, so it does not cost the descriptions `getCid10`
 * carries. The tables are the CID-10 V2008 files, the revision DATASUS publishes as CSV: a code
 * that is not in those files, such as `U07.1` (COVID-19), is not valid here.
 *
 * @param {string} value - The CID-10 code to be validated, e.g. `"A00.0"`, `"A000"` or `"A00"`.
 * @returns {boolean} True when the code is a known category or subcategory, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCid10("A00.0"); // true
 * isValidCid10("a000"); // true
 * isValidCid10("A00"); // true
 * isValidCid10("A00.5"); // false (A00 has no subcategory 5)
 * isValidCid10("A00-0"); // false (not a documented form)
 * ```
 *
 * @see Official: http://www2.datasus.gov.br/cid10/V2008/downloads/CID10CSV.zip
 * The CID-10 tables in CSV (`CID-10-CATEGORIAS.CSV` and `CID-10-SUBCATEGORIAS.CSV`), as
 * published by DATASUS (Ministério da Saúde).
 * @see Official: http://www2.datasus.gov.br/cid10/V2008/descrcsv.htm
 * The DATASUS page that links the archive and documents its files, columns and encoding.
 */
export const isValidCid10 = (value: string): boolean => {
	const code = normalizeCid10(value);
	const category = code.slice(0, CATEGORY_LENGTH);

	return (
		Object.hasOwn(CID10_SUBCATEGORIES, category) &&
		CID10_SUBCATEGORIES[category].includes(code.slice(CATEGORY_LENGTH))
	);
};
