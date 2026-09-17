import {
	NUMBER_TO_WORDS_MAX_VALUE,
	numberToWords,
} from "../_internals/number-to-words/number-to-words";

const MILLION_SCALE_SUFFIXES = ["lhão", "lhões"];

const ONE_CENTAVO = 0.01;

/**
 * Scales an amount to whole cents, truncating it, without letting the floating point noise of
 * the multiplication decide the result. `absolute * 100` lands a hair off the integer it should
 * be (`1.15 * 100` is `114.99999999999999`, `0.57 * 100` is `56.99999999999999`) and that error
 * grows with the amount, up to a whole cent for the trillions (`1000000000000.0099 * 100` is
 * `100000000000000.98`, a hair below an integer while the amount holds no cents at all), so the
 * cents are read off the decimal notation of the amount instead of off the product.
 * `String(absolute)` is the shortest decimal that reads back as `absolute`, i.e. the amount as
 * it was written, and its first two fractional digits are the cents; anything after them is
 * truncated, as it must be (`1.999999999` is one real and 99 cents).
 * An amount below one cent has no cents to read, which also keeps `String(absolute)` in plain
 * decimal notation: the exponent form only shows up below `1e-6` and from `1e21` up, and an
 * amount that large is out of range for the caller.
 *
 * @param {number} absolute - The absolute amount in reais.
 * @returns {number} The amount truncated to whole cents.
 */
const toCents = (absolute: number): number => {
	if (absolute < ONE_CENTAVO) return 0;

	const [wholeReais, fraction = ""] = String(absolute).split(".");

	return Number(`${wholeReais}${fraction.slice(0, 2).padEnd(2, "0")}`);
};

const endsInMillionScale = (words: string): boolean =>
	MILLION_SCALE_SUFFIXES.some((suffix) => words.endsWith(suffix));

/**
 * Formats a monetary amount in Brazilian Reais as its "por extenso" textual representation,
 * the style used to write out the amount by hand on cheques and contracts, e.g. `1523.45`
 * becomes `"mil quinhentos e vinte e três reais e quarenta e cinco centavos"`.
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
 * The result is always lowercase; apply any other casing to it yourself.
 *
 * @param {number} value - The monetary amount to convert, in reais (e.g. `1523.45` for R$ 1.523,45).
 * @returns {string} The amount written out in Portuguese, or `""` for invalid input.
 *
 * @example
 * ```typescript
 * convertCurrencyToWords(1523.45); // "mil quinhentos e vinte e três reais e quarenta e cinco centavos"
 * convertCurrencyToWords(1); // "um real"
 * convertCurrencyToWords(0.01); // "um centavo"
 * convertCurrencyToWords(1000000); // "um milhão de reais"
 * convertCurrencyToWords(0); // "zero reais"
 * convertCurrencyToWords(-5.5); // "menos cinco reais e cinquenta centavos"
 * convertCurrencyToWords(-0.001); // "zero reais"
 * ```
 *
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/currency.py
 */
export const convertCurrencyToWords = (value: number): string => {
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

	if (reais === 0 && centavos === 0) return "zero reais";

	const joined = parts.join(" ");

	// Stryker disable next-line EqualityOperator: equivalent, value is never exactly 0 here (reais === 0 && centavos === 0 already returned above)
	return value < 0 ? `menos ${joined}` : joined;
};
