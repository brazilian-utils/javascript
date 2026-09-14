import { removeAccents } from "../../remove-accents/remove-accents";

const WHITESPACE_RUN_REGEX = /\s+/g;

/**
 * Normalizes a municipality name so that two spellings of the same municipality compare equal.
 *
 * Accents are dropped, every run of whitespace collapses into a single space, the surrounding
 * whitespace is trimmed, and the casing is folded to upper case, the direction Unicode expands
 * `"ß"` to `"SS"` in, so `"Paßos"` normalizes to what `"Passos"` normalizes to. Only the runs
 * of whitespace that are there collapse, so a name written without a space the dataset carries
 * stays a different name.
 *
 * `removeAccents` already folds a value that is not a string down to `""`, which no real
 * municipality name normalizes to, so a caller may hand this helper an unvalidated value and
 * simply compare the result.
 *
 * @param {string} value - The municipality name to normalize.
 * @returns {string} The normalized name, or `""` when `value` is not a non-empty string.
 *
 * @example
 * ```typescript
 * normalizeMunicipalityName("São  Paulo"); // "SAO PAULO"
 * normalizeMunicipalityName("  Ceará-Mirim  "); // "CEARA-MIRIM"
 * normalizeMunicipalityName(""); // ""
 * ```
 */
export const normalizeMunicipalityName = (value: string): string =>
	removeAccents(value).replaceAll(WHITESPACE_RUN_REGEX, " ").trim().toUpperCase();
