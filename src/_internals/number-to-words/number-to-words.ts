import {
	HUNDRED_EXACT,
	HUNDREDS_FEMININE,
	HUNDREDS_MASCULINE,
	SCALE_WORDS,
	TENS,
	UNITS,
	UNITS_FEMININE_OVERRIDES,
	ZERO_WORD,
} from "../constants/number-words";

/** The grammatical gender `convertNumberToWords` agrees the number it writes out with. */
export type NumberToWordsGender = "masculine" | "feminine";

export type NumberToWordsOptions = {
	/** Grammatical gender used to agree "um/dois" and the 100-999 group ("duzentos/duzentas", etc.) with the noun the number qualifies. Only the thousands group and the final 0-999 group are affected: the multiplier of "milhão/bilhão/trilhão" always agrees with those (masculine) nouns. Defaults to `"masculine"`. */
	gender?: NumberToWordsGender;
};

/**
 * The largest absolute value `numberToWords` converts: 999 trillion, 999 billion, 999 million,
 * 999 thousand and 999 (999999999999999), the highest value expressible with the "trilhão"
 * scale word before a new scale word would be required.
 */
export const NUMBER_TO_WORDS_MAX_VALUE = 999_999_999_999_999;

const unitWord = (digit: number, gender?: NumberToWordsGender): string =>
	gender === "feminine" && digit in UNITS_FEMININE_OVERRIDES
		? UNITS_FEMININE_OVERRIDES[digit]
		: UNITS[digit];

const groupToWords = (value: number, gender?: NumberToWordsGender): string => {
	const hundredsDigit = Math.floor(value / 100);
	const remainder = value % 100;
	const segments: string[] = [];

	if (hundredsDigit > 0) {
		const hundreds = gender === "feminine" ? HUNDREDS_FEMININE : HUNDREDS_MASCULINE;
		segments.push(value === 100 ? HUNDRED_EXACT : hundreds[hundredsDigit]);
	}

	if (remainder > 0) {
		if (remainder < 20) {
			segments.push(unitWord(remainder, gender));
		} else {
			const tensDigit = Math.floor(remainder / 10);
			const unitsDigit = remainder % 10;
			segments.push(
				unitsDigit > 0 ? `${TENS[tensDigit]} e ${unitWord(unitsDigit, gender)}` : TENS[tensDigit],
			);
		}
	}

	return segments.join(" e ");
};

const scaledGroupToWords = (
	groupValue: number,
	scale: number,
	gender: NumberToWordsGender | undefined,
): string => {
	const scaleWord = SCALE_WORDS[scale];

	if (scale === 0) return groupToWords(groupValue, gender);
	if (scale === 1 && groupValue === 1) return scaleWord.singular;

	return `${groupToWords(groupValue, gender)} ${groupValue === 1 ? scaleWord.singular : scaleWord.plural}`;
};

const isRoundHundred = (value: number): boolean => value % 100 === 0;

/**
 * Converts a non-negative integer into its Brazilian Portuguese cardinal number words
 * ("por extenso"), e.g. `1235` becomes `"mil duzentos e trinta e cinco"`.
 *
 * This is the shared engine behind every "por extenso" formatter of this library
 * (`convertNumberToWords`, `convertCurrencyToWords`, `convertDateToWords`): it only converts, it
 * never validates or sanitizes its input, so callers must pass a finite, non-negative integer
 * within `[0, NUMBER_TO_WORDS_MAX_VALUE]`. Groups are joined by a space, and "e" is used right
 * before the last group when that group is below 100 or is a round hundred (100, 200, ..., 900),
 * the way the official texts write amounts out: `1200` -> `"mil e duzentos"`, `1001` -> `"mil e
 * um"`, `1235` -> `"mil duzentos e trinta e cinco"`, `1045678` -> `"um milhão quarenta e cinco mil
 * seiscentos e setenta e oito"`. This is the spelling of the Lei Orçamentária Anual ("cinco
 * trilhões quinhentos e sessenta e seis bilhões duzentos e oitenta e quatro milhões oitocentos e
 * dez mil trezentos e setenta e três reais", Lei 14.822/2024, art. 1º, and "novecentos e trinta e
 * um mil e oitenta e um reais" for the "e" before a last group below 100, art. 2º, inciso III), of
 * the salário mínimo
 * decrees ("mil quinhentos e dezoito reais", Decreto 12.342/2024) and of the examples in the Manual
 * de Redação da Presidência da República ("mil duzentos e cinquenta reais", "mil e quatrocentos
 * reais"). It deviates from `num2words`' pt_BR locale, which separates the groups with commas
 * ("mil, duzentos e trinta e cinco") and writes "e" before an intermediate group below 100.
 *
 * @param {number} value - A non-negative integer in `[0, NUMBER_TO_WORDS_MAX_VALUE]`.
 * @param {NumberToWordsOptions} [options] - Optional conversion options.
 * @param {NumberToWordsGender} [options.gender] - Grammatical gender for "um/dois" and the hundreds group. Defaults to `"masculine"`.
 * @returns {string} The cardinal number written out in Portuguese.
 *
 * @example
 * ```typescript
 * numberToWords(0); // "zero"
 * numberToWords(21); // "vinte e um"
 * numberToWords(100); // "cem"
 * numberToWords(1100); // "mil e cem"
 * numberToWords(1235); // "mil duzentos e trinta e cinco"
 * numberToWords(2000000); // "dois milhões"
 * numberToWords(2, { gender: "feminine" }); // "duas"
 * numberToWords(2000, { gender: "feminine" }); // "duas mil"
 * ```
 *
 * @see Official: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/L14822.htm
 * Lei nº 14.822, de 22 de janeiro de 2024 (Lei Orçamentária Anual de 2024): amounts written out with
 * the groups separated by spaces and "e" only inside a group (art. 1º), "e" before the last group
 * when that group is below 100 ("novecentos e trinta e um mil e oitenta e um reais", art. 2º,
 * inciso III) and "quatorze" for 14 (art. 2º and art. 3º, caput).
 * @see Official: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/decreto/D12342.htm
 * Decreto nº 12.342, de 30 de dezembro de 2024, art. 1º: "R$ 1.518,00 (mil quinhentos e dezoito reais)".
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/currency.py
 */
export const numberToWords = (value: number, options?: NumberToWordsOptions): string => {
	if (value === 0) return ZERO_WORD;

	const gender = options?.gender;
	const groups: number[] = [];
	let remaining = value;

	while (remaining > 0) {
		groups.unshift(remaining % 1000);
		remaining = Math.floor(remaining / 1000);
	}

	const highestScale = groups.length - 1;
	const lastNonZeroIndex = groups.findLastIndex((groupValue) => groupValue > 0);

	let result = "";

	for (const [index, groupValue] of groups.entries()) {
		if (groupValue === 0) continue;

		const scale = highestScale - index;
		const groupText = scaledGroupToWords(groupValue, scale, scale >= 2 ? undefined : gender);

		if (result === "") {
			result = groupText;
			continue;
		}

		const connector =
			// Stryker disable next-line EqualityOperator: equivalent, groupValue === 100 already satisfies isRoundHundred(groupValue)
			index === lastNonZeroIndex && (groupValue < 100 || isRoundHundred(groupValue)) ? " e " : " ";

		result += connector + groupText;
	}

	return result;
};
