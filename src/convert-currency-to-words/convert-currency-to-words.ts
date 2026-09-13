import { applyWordsCase } from "../_internals/apply-words-case/apply-words-case";
import {
	NUMBER_TO_WORDS_MAX_VALUE,
	numberToWords,
	type WordsCase,
} from "../_internals/number-to-words/number-to-words";

/** Options of `convertCurrencyToWords`. */
export type ConvertCurrencyToWordsOptions = {
	/** Letter case applied to the result: `"lower"` (unchanged), `"sentence"` (capitalizes only the first letter) or `"upper"` (uppercases everything, keeping accents). Defaults to `"lower"`; an invalid value is ignored and `"lower"` is used instead. */
	case?: WordsCase;
};

const MILLION_SCALE_SUFFIXES = ["lhão", "lhões"];

/**
 * Scales an amount to whole cents, truncating it, without letting the floating point noise of
 * the multiplication decide the result. `absolute * 100` lands a hair off the integer it
 * should be (`1.15 * 100` is `114.99999999999999`, `0.57 * 100` is `56.99999999999999`), so a
 * scaled value within one double rounding error of an integer is read as that integer.
 * An amount that is genuinely below the next cent sits much further away than that
 * (`1.999999999 * 100` is `199.9999999`) and is truncated, as it must be.
 *
 * @param {number} absolute - The absolute amount in reais.
 * @returns {number} The amount truncated to whole cents.
 */
const toCents = (absolute: number): number => {
	const scaled = absolute * 100;
	const rounded = Math.round(scaled);

	// Stryker disable next-line EqualityOperator: `<` is equivalent, the two sides are never equal. Writing scaled as m * 2 ** (k - 52) with 2 ** k <= scaled < 2 ** (k + 1) and m its 53 bit significand, both scaled and rounded are multiples of the ulp 2 ** (k - 52), so the difference is j * 2 ** (k - 52) for an integer j, while Number.EPSILON * scaled is exactly m * 2 ** (k - 104): equality asks for m === j * 2 ** 52, and m < 2 ** 53 leaves only m === 2 ** 52, i.e. scaled a power of two. A power of two of at least 1 is an integer, whose difference is 0, and one below 1 rounds to 0 or to 1 at a distance of at least 0.25, never one ulp. The only case where both sides are 0 is scaled === 0, where rounded and Math.trunc(scaled) are both 0 anyway
	return Math.abs(scaled - rounded) <= Number.EPSILON * scaled ? rounded : Math.trunc(scaled);
};

const endsInMillionScale = (words: string): boolean =>
	MILLION_SCALE_SUFFIXES.some((suffix) => words.endsWith(suffix));

/**
 * Formats a monetary amount in Brazilian Reais as its "por extenso" textual representation,
 * the style used to write out the amount by hand on cheques and contracts, e.g. `1523.45`
 * becomes `"mil, quinhentos e vinte e três reais e quarenta e cinco centavos"`.
 *
 * `value` is truncated (not rounded) to 2 decimal places before conversion, matching
 * `brutils`' `convert_real_to_text`. The singular noun is used for exactly 1 ("um real",
 * "um centavo") and "de" is inserted before "reais" when the amount is a round million,
 * billion or trillion of reais ("um milhão de reais", "dois milhões de reais"). An amount that
 * truncates to nothing becomes `"zero reais"`, with no "menos" prefix even when `value` is
 * negative (`-0.001` is not a debt of anything); any other negative amount is prefixed with
 * "menos". `NaN`/non-finite values and amounts whose reais exceed `NUMBER_TO_WORDS_MAX_VALUE`
 * (999 trillion) return `""`. Above `Number.MAX_SAFE_INTEGER / 100` reais (about 90 trillion) a
 * double cannot carry cents at all, so the amount is read as a whole number of reais instead of
 * reporting cents that the input never held.
 *
 * @param {number} value - The monetary amount to convert, in reais (e.g. `1523.45` for R$ 1.523,45).
 * @param {ConvertCurrencyToWordsOptions} [options] - Optional formatting options.
 * @param {WordsCase} [options.case] - Letter case applied to the result. Defaults to `"lower"`.
 * @returns {string} The amount written out in Portuguese, or `""` for invalid input.
 *
 * @example
 * ```typescript
 * convertCurrencyToWords(1523.45); // "mil, quinhentos e vinte e três reais e quarenta e cinco centavos"
 * convertCurrencyToWords(1); // "um real"
 * convertCurrencyToWords(0.01); // "um centavo"
 * convertCurrencyToWords(1000000); // "um milhão de reais"
 * convertCurrencyToWords(0); // "zero reais"
 * convertCurrencyToWords(-5.5); // "menos cinco reais e cinquenta centavos"
 * convertCurrencyToWords(1000, { case: "upper" }); // "MIL REAIS"
 * ```
 *
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/currency.py
 */
export const convertCurrencyToWords = (
	value: number,
	options?: ConvertCurrencyToWordsOptions,
): string => {
	if (!Number.isFinite(value)) return "";

	const absolute = Math.abs(value);
	const hasExactCents = absolute * 100 <= Number.MAX_SAFE_INTEGER;
	const totalCents = hasExactCents ? toCents(absolute) : 0;

	const reais = hasExactCents ? Math.floor(totalCents / 100) : Math.trunc(absolute);
	const centavos = hasExactCents ? totalCents % 100 : 0;

	if (reais > NUMBER_TO_WORDS_MAX_VALUE) return "";

	const parts: string[] = [];

	if (reais > 0) {
		const reaisWords = numberToWords(reais);
		const connector = endsInMillionScale(reaisWords) ? "de " : "";
		parts.push(`${reaisWords} ${connector}${reais === 1 ? "real" : "reais"}`);
	}

	if (centavos > 0) {
		const centavosText = `${numberToWords(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`;
		parts.push(reais > 0 ? `e ${centavosText}` : centavosText);
	}

	if (reais === 0 && centavos === 0) return applyWordsCase("zero reais", options?.case);

	const joined = parts.join(" ");
	// Stryker disable next-line EqualityOperator: equivalent, value is never exactly 0 here (reais === 0 && centavos === 0 already returned above)
	const result = value < 0 ? `menos ${joined}` : joined;

	return applyWordsCase(result, options?.case);
};
