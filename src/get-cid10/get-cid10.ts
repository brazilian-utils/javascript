import { CID10_SUBCATEGORIES } from "../_internals/constants/cid10";
import { CID10_DESCRIPTIONS } from "../_internals/constants/cid10-descriptions";
import { normalizeCid10 } from "../_internals/normalize-cid10/normalize-cid10";
import { isValidCid10 } from "../is-valid-cid10/is-valid-cid10";

const CATEGORY_LENGTH = 3;

/**
 * The index of a listed code in `CID10_DESCRIPTIONS`, which holds every category of
 * `CID10_SUBCATEGORIES`, in its order, followed by its subcategories: the categories before the
 * code's own take one description each plus one per subcategory, then the category's own
 * description comes first and each subcategory follows at the position of its fourth character
 * plus one (a category, whose fourth character is `""`, is found at 0 and adds no length).
 *
 * @param {string} code - A code `isValidCid10` accepts, normalized.
 * @returns {number} The index of its description.
 */
const findDescriptionIndex = (code: string): number => {
	const category = code.slice(0, CATEGORY_LENGTH);
	const subcategory = code.slice(CATEGORY_LENGTH);
	const categories = Object.keys(CID10_SUBCATEGORIES);
	const preceding = categories.slice(0, categories.indexOf(category));
	const offset = preceding.reduce(
		(index, listed) => index + 1 + CID10_SUBCATEGORIES[listed].length,
		0,
	);

	return offset + CID10_SUBCATEGORIES[category].indexOf(subcategory) + subcategory.length;
};

/**
 * A CID-10 (Classificação Internacional de Doenças, 10th revision) category or subcategory.
 */
export type Cid10 = {
	/** The 3 character category or 4 character subcategory code, upper case and without the dot. */
	code: string;
	/** The official Brazilian Portuguese description, as the DATASUS table prints it. */
	description: string;
};

/**
 * Looks a CID-10 (Classificação Estatística Internacional de Doenças e Problemas Relacionados à
 * Saúde, 10th revision) code up in the Brazilian Portuguese tables DATASUS publishes.
 *
 * Both levels of the classification are found: the 3 character categories (`A00`) and the 4
 * character subcategories, written with the dot medical certificates print (`A00.0`) or without
 * it, the form the DATASUS tables store (`A000`). Letter case and surrounding whitespace are
 * ignored. Anything else (`"A00-0"`, `"A00.00"`, a dagger or asterisk suffix, a value that is
 * not a string) is rejected instead of having a code picked out of it.
 *
 * The tables are the CID-10 V2008 files, the revision DATASUS publishes as CSV: a code that is
 * not in those files, such as `U07.1` (COVID-19), is not found.
 *
 * @param {string} value - The CID-10 code to look up, e.g. `"A00.0"`, `"A000"` or `"A00"`.
 * @returns {Cid10|null} The matching category or subcategory, or null when the code is unknown
 * or invalid.
 *
 * @example
 * ```typescript
 * getCid10("A00.0"); // { code: "A000", description: "Cólera devida a Vibrio cholerae 01, biótipo cholerae" }
 * getCid10("a000"); // { code: "A000", description: "Cólera devida a Vibrio cholerae 01, biótipo cholerae" }
 * getCid10("A00"); // { code: "A00", description: "Cólera" }
 * getCid10("A00.5"); // null (A00 has no subcategory 5)
 * getCid10("A00-0"); // null (not a documented form)
 * ```
 *
 * @see Official: http://www2.datasus.gov.br/cid10/V2008/downloads/CID10CSV.zip
 * The CID-10 tables in CSV (`CID-10-CATEGORIAS.CSV` and `CID-10-SUBCATEGORIAS.CSV`), as
 * published by DATASUS (Ministério da Saúde).
 * @see Official: http://www2.datasus.gov.br/cid10/V2008/descrcsv.htm
 * The DATASUS page that links the archive and documents its files, columns and encoding.
 */
export const getCid10 = (value: string): Cid10 | null => {
	if (!isValidCid10(value)) return null;

	const code = normalizeCid10(value);

	return { code, description: CID10_DESCRIPTIONS[findDescriptionIndex(code)] };
};
