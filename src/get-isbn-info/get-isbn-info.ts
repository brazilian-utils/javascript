import { ISBN_GROUP_RULES, ISBN_PREFIX_RULES } from "../_internals/constants/isbn-ranges";
import { isValidIsbn } from "../is-valid-isbn/is-valid-isbn";
import { parseIsbn } from "../parse-isbn/parse-isbn";
import { BRAZIL_AGENCY, PREFIX_LENGTH, RANGE_DIGITS } from "./constants";

/** The elements `getIsbnInfo` reads out of an ISBN-13. */
export type IsbnInfo = {
	/** The 13 digits, no label and no hyphens. */
	isbn: string;
	/** The GS1 prefix, "978" or "979". */
	prefix: string;
	/** The registration group: a country, a region or a language area, e.g. "85" or "65" for Brazil. */
	registrationGroup: string;
	/** The registrant element: the publisher or imprint within the group. */
	registrant: string;
	/** The publication element: the edition within the registrant. */
	publication: string;
	/** The modulus 10 check digit, the last digit. */
	checkDigit: number;
	/** The agency the International ISBN Agency lists for the group, e.g. "Brazil" or "English language". */
	agency: string;
	/** True when the group is one of the Agência Brasileira do ISBN, 85 or 65. */
	isBrazilian: boolean;
};

/**
 * Reads the length an element takes from the rules of the RangeMessage, given the 7 digits that
 * follow the part already read.
 *
 * @param {string} rules - `end:length` pairs, each range starting where the one before it ended.
 * @param {string} digits - The digits after the part already read, before the check digit.
 * @returns {number} The length of the element, 0 when the range is not assigned.
 */
const readElementLength = (rules: string, digits: string): number => {
	const value = Number(digits.padEnd(RANGE_DIGITS, "0").slice(0, RANGE_DIGITS));
	const rule = rules.split(",").find((pair) => value <= Number(pair.slice(0, RANGE_DIGITS)));

	// Stryker disable next-line OptionalChaining: every rule list ends at 9999999, the largest value 7 digits hold, so a rule is always found; the chaining only satisfies the type.
	return Number(rule?.slice(RANGE_DIGITS + 1));
};

/**
 * Splits a valid ISBN-13 into its elements, following the ranges the International ISBN Agency
 * publishes: the GS1 prefix, the registration group, the registrant, the publication and the
 * check digit.
 *
 * The value is accepted under the same rules as `isValidIsbn`. The registration group and the
 * registrant have variable lengths, which only the published ranges give; an ISBN whose group or
 * registrant falls in a range not assigned yet returns `null`, although its check digit is valid.
 * The ranges come from the RangeMessage of 27/09/2026 and are refreshed by the datasets workflow.
 *
 * @param {string} value - The ISBN, printed or not.
 * @returns {IsbnInfo|null} The elements, or `null` when `value` is not a valid ISBN-13 or its
 * group or registrant is not assigned.
 *
 * @example
 * ```typescript
 * getIsbnInfo("ISBN 978-65-89999-01-0");
 * // { isbn: "9786589999010", prefix: "978", registrationGroup: "65", registrant: "89999",
 * //   publication: "01", checkDigit: 0, agency: "Brazil", isBrazilian: true }
 *
 * getIsbnInfo("9780306406157")?.agency; // "English language"
 * getIsbnInfo("9786589999011"); // null (wrong check digit)
 * ```
 *
 * @see Official: https://www.isbn-international.org/range_file_generation
 * International ISBN Agency, ISBN Ranges: the RangeMessage, whose `<EAN.UCC>` rules give the
 * length of the registration group and whose `<Group>` rules give the length of the registrant.
 * @see Official: https://www.cblservicos.org.br/isbn/estrutura/
 * Agência Brasileira do ISBN, "Estrutura do ISBN": "Código GTIN/ grupo registrante / elemento
 * registrante/ publicação / dígito verificador"; in Brazil the group "mais utilizado foi o 85,
 * mas desde 2018 ... o 65 também passou a ser utilizado".
 */
export const getIsbnInfo = (value: string): IsbnInfo | null => {
	if (!isValidIsbn(value)) return null;

	const isbn = parseIsbn(value);
	const prefix = isbn.slice(0, PREFIX_LENGTH);
	const body = isbn.slice(PREFIX_LENGTH, -1);
	const groupLength = readElementLength(ISBN_PREFIX_RULES[prefix], body);
	const registrationGroup = body.slice(0, groupLength);
	const group = ISBN_GROUP_RULES[`${prefix}-${registrationGroup}`];

	// A group of length 0, not assigned, reads as the empty group, which no entry carries either.
	if (group === undefined) return null;

	const [agency, rules] = group;
	const rest = body.slice(groupLength);
	const registrantLength = readElementLength(rules, rest);

	if (registrantLength === 0) return null;

	return {
		isbn,
		prefix,
		registrationGroup,
		registrant: rest.slice(0, registrantLength),
		publication: rest.slice(registrantLength),
		checkDigit: Number(isbn.at(-1)),
		agency,
		isBrazilian: agency === BRAZIL_AGENCY,
	};
};
