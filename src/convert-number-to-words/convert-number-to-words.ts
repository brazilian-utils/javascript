import { applyWordsCase } from "../_internals/apply-words-case/apply-words-case";
import {
	NUMBER_TO_WORDS_MAX_VALUE,
	type NumberToWordsGender,
	numberToWords,
	type WordsCase,
} from "../_internals/number-to-words/number-to-words";

export type ConvertNumberToWordsOptions = {
	/** Grammatical gender used to agree "um/dois" and the hundreds group ("duzentos/duzentas", etc.) with the noun the number qualifies. Defaults to `"masculine"`. */
	gender?: NumberToWordsGender;
	/** Letter case applied to the result: `"lower"` (unchanged), `"sentence"` (capitalizes only the first letter) or `"upper"` (uppercases everything, keeping accents). Defaults to `"lower"`; an invalid value is ignored and `"lower"` is used instead. */
	case?: WordsCase;
};

/**
 * Formats an integer as its Brazilian Portuguese cardinal number words ("por extenso"),
 * e.g. `1235` becomes `"mil, duzentos e trinta e cinco"`.
 *
 * Only integers from `-999999999999999` to `999999999999999` (999 trillion in absolute value,
 * the highest value expressible with the "trilhão" scale word) are supported; anything outside
 * that range, `NaN` or a non-finite value (`Infinity`/`-Infinity`) returns `""`. A non-integer
 * `value` is truncated toward zero before conversion (`12.9` behaves like `12`); this function
 * only writes out whole numbers, it never spells out a decimal part (use
 * `convertCurrencyToWords` for a monetary amount with cents).
 *
 * @param {number} value - The integer to convert.
 * @param {ConvertNumberToWordsOptions} [options] - Optional formatting options.
 * @param {NumberToWordsGender} [options.gender] - Grammatical gender for "um/dois" and the hundreds group. Defaults to `"masculine"`.
 * @param {WordsCase} [options.case] - Letter case applied to the result. Defaults to `"lower"`.
 * @returns {string} The cardinal number written out in Portuguese, or `""` for invalid input.
 *
 * @example
 * ```typescript
 * convertNumberToWords(123); // "cento e vinte e três"
 * convertNumberToWords(1001); // "mil e um"
 * convertNumberToWords(2000000); // "dois milhões"
 * convertNumberToWords(-42); // "menos quarenta e dois"
 * convertNumberToWords(2, { gender: "feminine" }); // "duas"
 * convertNumberToWords(3, { case: "upper" }); // "TRÊS"
 * convertNumberToWords(NaN); // ""
 * ```
 *
 * @see https://github.com/brazilian-utils/python/blob/main/brutils/currency.py
 */
export const convertNumberToWords = (
	value: number,
	options?: ConvertNumberToWordsOptions,
): string => {
	if (!Number.isFinite(value)) return "";

	const truncated = Math.trunc(value);

	if (Math.abs(truncated) > NUMBER_TO_WORDS_MAX_VALUE) return "";

	const words = numberToWords(Math.abs(truncated), { gender: options?.gender });
	const result = truncated < 0 ? `menos ${words}` : words;

	return applyWordsCase(result, options?.case);
};
