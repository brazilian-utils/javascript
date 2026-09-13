import {
	NUMBER_TO_WORDS_MAX_VALUE,
	type NumberToWordsGender,
	numberToWords,
} from "../_internals/number-to-words/number-to-words";

/** Options of `convertNumberToWords`. */
export type ConvertNumberToWordsOptions = {
	/** Grammatical gender used to agree "um/dois" and the hundreds group ("duzentos/duzentas", etc.) with the noun the number qualifies. Defaults to `"masculine"`. */
	gender?: NumberToWordsGender;
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
 * The result is always lowercase; apply any other casing to it yourself.
 *
 * @param {number} value - The integer to convert.
 * @param {ConvertNumberToWordsOptions} [options] - Optional formatting options.
 * @param {NumberToWordsGender} [options.gender] - Grammatical gender for "um/dois" and the hundreds group. Defaults to `"masculine"`.
 * @returns {string} The cardinal number written out in Portuguese, or `""` for invalid input.
 *
 * @example
 * ```typescript
 * convertNumberToWords(123); // "cento e vinte e três"
 * convertNumberToWords(1001); // "mil e um"
 * convertNumberToWords(2000000); // "dois milhões"
 * convertNumberToWords(-42); // "menos quarenta e dois"
 * convertNumberToWords(2, { gender: "feminine" }); // "duas"
 * convertNumberToWords(12.9); // "doze" (truncated toward zero)
 * convertNumberToWords(NaN); // ""
 * ```
 *
 * @see Based on: https://github.com/savoirfairelinux/num2words `brutils` itself has no dedicated
 * number-to-words module (its `currency.py` delegates the Portuguese numeral text to this
 * library's `pt_BR` locale); this is the reference for the numeral-word tables reproduced here.
 */
export const convertNumberToWords = (
	value: number,
	options?: ConvertNumberToWordsOptions,
): string => {
	if (!Number.isFinite(value)) return "";

	const truncated = Math.trunc(value);

	if (Math.abs(truncated) > NUMBER_TO_WORDS_MAX_VALUE) return "";

	const words = numberToWords(Math.abs(truncated), { gender: options?.gender });

	return truncated < 0 ? `menos ${words}` : words;
};
