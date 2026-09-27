import { getIsbnInfo } from "../get-isbn-info/get-isbn-info";

/**
 * Formats an ISBN-13 the way it is printed: its five elements separated by hyphens
 * (`978-65-89999-01-0`), the lengths of the registration group and of the registrant taken from
 * the ranges the International ISBN Agency publishes, as `getIsbnInfo` reads them.
 *
 * Those lengths vary, so a partial or invalid value cannot be formatted piece by piece the way
 * `formatCpf` does: it returns `""`, and so does a valid ISBN whose group or registrant falls in a
 * range not assigned yet. The "ISBN" label is not added.
 *
 * @param {string} value - The ISBN, printed or not.
 * @returns {string} The hyphenated ISBN, or `""` when `getIsbnInfo` returns `null` for it.
 *
 * @example
 * ```typescript
 * formatIsbn("9786589999010"); // "978-65-89999-01-0"
 * formatIsbn("ISBN 9788533302273"); // "978-85-333-0227-3"
 * formatIsbn("978658999901"); // "" (12 digits)
 * ```
 *
 * @see Official: https://www.cblservicos.org.br/isbn/estrutura/
 * Agência Brasileira do ISBN, "Estrutura do ISBN": "Os elementos do ISBN são separados por
 * hifens", with the example "ISBN 978-65-89999-01-3" (whose check digit should be 0).
 */
export const formatIsbn = (value: string): string => {
	const info = getIsbnInfo(value);

	if (info === null) return "";

	return [
		info.prefix,
		info.registrationGroup,
		info.registrant,
		info.publication,
		info.checkDigit,
	].join("-");
};
