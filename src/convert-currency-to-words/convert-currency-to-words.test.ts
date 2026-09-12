import { NUMBER_TO_WORDS_MAX_VALUE } from "../_internals/number-to-words/number-to-words";
import { describe, expect, test } from "../_internals/test/runtime";
import { convertCurrencyToWords } from "./convert-currency-to-words";

function expectAmounts(cases: readonly (readonly [number, string])[]): void {
	const failures = cases
		.map(([amount, expected]) => ({ amount, actual: convertCurrencyToWords(amount), expected }))
		.filter(({ actual, expected }) => actual !== expected);

	expect(failures).toEqual([]);
}

describe("convertCurrencyToWords", () => {
	test("should return 'zero reais' for 0", () => {
		expect(convertCurrencyToWords(0)).toBe("zero reais");
	});

	test("should return 'um centavo' for 0.01", () => {
		expect(convertCurrencyToWords(0.01)).toBe("um centavo");
	});

	test("should return 'um real' for 1.00", () => {
		expect(convertCurrencyToWords(1)).toBe("um real");
	});

	test("should return 'um real e um centavo' for 1.01", () => {
		expect(convertCurrencyToWords(1.01)).toBe("um real e um centavo");
	});

	test("should insert 'de' before 'reais' for a round million (1000000.00, brutils 'convert_real_to_text')", () => {
		expect(convertCurrencyToWords(1_000_000)).toBe("um milhão de reais");
	});

	test("should pluralize the 'de' connector for two round million (2000000.00)", () => {
		expect(convertCurrencyToWords(2_000_000)).toBe("dois milhões de reais");
	});

	test("should join reais and centavos with 'e' (1523.45, brutils 'convert_real_to_text' example)", () => {
		expect(convertCurrencyToWords(1523.45)).toBe(
			"mil, quinhentos e vinte e três reais e quarenta e cinco centavos",
		);
	});

	test("should not insert 'de' when a mil/hundred group follows the million group", () => {
		expect(convertCurrencyToWords(1_000_230)).toBe("um milhão, duzentos e trinta reais");
	});

	test("should return only the centavos when the reais part is zero", () => {
		expect(convertCurrencyToWords(0.5)).toBe("cinquenta centavos");
	});

	test("should return only the reais when the centavos part is zero", () => {
		expect(convertCurrencyToWords(100)).toBe("cem reais");
	});

	test("should truncate (not round) to 2 decimal places", () => {
		expect(convertCurrencyToWords(1.999)).toBe("um real e noventa e nove centavos");
	});

	test("should prefix negative amounts with 'menos'", () => {
		expect(convertCurrencyToWords(-5.5)).toBe("menos cinco reais e cinquenta centavos");
		expect(convertCurrencyToWords(-0.01)).toBe("menos um centavo");
	});

	test("should return '' when the reais part exceeds the maximum supported value", () => {
		expect(convertCurrencyToWords(NUMBER_TO_WORDS_MAX_VALUE + 1)).toBe("");
	});

	describe("invalid input", () => {
		test("should return '' for NaN", () => {
			expect(convertCurrencyToWords(Number.NaN)).toBe("");
		});

		test("should return '' for Infinity and -Infinity", () => {
			expect(convertCurrencyToWords(Number.POSITIVE_INFINITY)).toBe("");
			expect(convertCurrencyToWords(Number.NEGATIVE_INFINITY)).toBe("");
		});

		test("should return '' for a non-number value", () => {
			// @ts-expect-error: intentionally invalid input
			expect(convertCurrencyToWords("1523.45")).toBe("");
			// @ts-expect-error: intentionally invalid input
			expect(convertCurrencyToWords(null)).toBe("");
			// @ts-expect-error: intentionally invalid input
			expect(convertCurrencyToWords()).toBe("");
		});
	});

	describe("zero amounts", () => {
		test("should not prefix 'menos' when a negative amount truncates to nothing", () => {
			expect(convertCurrencyToWords(-0.001)).toBe("zero reais");
			expect(convertCurrencyToWords(-0.009)).toBe("zero reais");
		});

		test("should return 'zero reais' for negative zero", () => {
			expect(convertCurrencyToWords(-0)).toBe("zero reais");
		});

		test("should return 'zero reais' for an amount below one centavo", () => {
			expect(convertCurrencyToWords(0.004)).toBe("zero reais");
		});
	});

	describe("amounts too large to carry cents", () => {
		test("should read an amount above Number.MAX_SAFE_INTEGER cents as whole reais", () => {
			expect(convertCurrencyToWords(100_000_000_000_000.02)).toBe("cem trilhões de reais");
		});

		test("should still report cents just below that limit", () => {
			expect(convertCurrencyToWords(9_007_199_254_740.99)).toContain("noventa e nove centavos");
		});

		test("should still report cents exactly at the Number.MAX_SAFE_INTEGER cents boundary", () => {
			expect(convertCurrencyToWords(90_071_992_547_409.9)).toContain("noventa e um centavos");
		});
	});

	describe("case option", () => {
		test("should keep the result lowercase by default", () => {
			expect(convertCurrencyToWords(1000)).toBe("mil reais");
		});

		test("should keep the result lowercase for 'lower'", () => {
			expect(convertCurrencyToWords(1000, { case: "lower" })).toBe("mil reais");
		});

		test("should capitalize only the first letter for 'sentence'", () => {
			expect(convertCurrencyToWords(1000, { case: "sentence" })).toBe("Mil reais");
			expect(convertCurrencyToWords(0, { case: "sentence" })).toBe("Zero reais");
		});

		test("should uppercase everything for 'upper', keeping accents", () => {
			expect(convertCurrencyToWords(1000, { case: "upper" })).toBe("MIL REAIS");
			expect(convertCurrencyToWords(1523.45, { case: "upper" })).toBe(
				"MIL, QUINHENTOS E VINTE E TRÊS REAIS E QUARENTA E CINCO CENTAVOS",
			);
			expect(convertCurrencyToWords(-5.5, { case: "upper" })).toBe(
				"MENOS CINCO REAIS E CINQUENTA CENTAVOS",
			);
		});

		test("should ignore an invalid case value and fall back to 'lower'", () => {
			// @ts-expect-error: intentionally invalid input
			expect(convertCurrencyToWords(1000, { case: "invalid" })).toBe("mil reais");
		});
	});

	describe("literal case tables", () => {
		test("should match a hand-written string for every amount from R$ 0.00 to R$ 1.49, cent by cent", () => {
			const cases: [number, string][] = [
				[0, "zero reais"],
				[1, "um centavo"],
				[2, "dois centavos"],
				[3, "três centavos"],
				[4, "quatro centavos"],
				[5, "cinco centavos"],
				[6, "seis centavos"],
				[7, "sete centavos"],
				[8, "oito centavos"],
				[9, "nove centavos"],
				[10, "dez centavos"],
				[11, "onze centavos"],
				[12, "doze centavos"],
				[13, "treze centavos"],
				[14, "catorze centavos"],
				[15, "quinze centavos"],
				[16, "dezesseis centavos"],
				[17, "dezessete centavos"],
				[18, "dezoito centavos"],
				[19, "dezenove centavos"],
				[20, "vinte centavos"],
				[21, "vinte e um centavos"],
				[22, "vinte e dois centavos"],
				[23, "vinte e três centavos"],
				[24, "vinte e quatro centavos"],
				[25, "vinte e cinco centavos"],
				[26, "vinte e seis centavos"],
				[27, "vinte e sete centavos"],
				[28, "vinte e oito centavos"],
				[29, "vinte e nove centavos"],
				[30, "trinta centavos"],
				[31, "trinta e um centavos"],
				[32, "trinta e dois centavos"],
				[33, "trinta e três centavos"],
				[34, "trinta e quatro centavos"],
				[35, "trinta e cinco centavos"],
				[36, "trinta e seis centavos"],
				[37, "trinta e sete centavos"],
				[38, "trinta e oito centavos"],
				[39, "trinta e nove centavos"],
				[40, "quarenta centavos"],
				[41, "quarenta e um centavos"],
				[42, "quarenta e dois centavos"],
				[43, "quarenta e três centavos"],
				[44, "quarenta e quatro centavos"],
				[45, "quarenta e cinco centavos"],
				[46, "quarenta e seis centavos"],
				[47, "quarenta e sete centavos"],
				[48, "quarenta e oito centavos"],
				[49, "quarenta e nove centavos"],
				[50, "cinquenta centavos"],
				[51, "cinquenta e um centavos"],
				[52, "cinquenta e dois centavos"],
				[53, "cinquenta e três centavos"],
				[54, "cinquenta e quatro centavos"],
				[55, "cinquenta e cinco centavos"],
				[56, "cinquenta e seis centavos"],
				[57, "cinquenta e sete centavos"],
				[58, "cinquenta e oito centavos"],
				[59, "cinquenta e nove centavos"],
				[60, "sessenta centavos"],
				[61, "sessenta e um centavos"],
				[62, "sessenta e dois centavos"],
				[63, "sessenta e três centavos"],
				[64, "sessenta e quatro centavos"],
				[65, "sessenta e cinco centavos"],
				[66, "sessenta e seis centavos"],
				[67, "sessenta e sete centavos"],
				[68, "sessenta e oito centavos"],
				[69, "sessenta e nove centavos"],
				[70, "setenta centavos"],
				[71, "setenta e um centavos"],
				[72, "setenta e dois centavos"],
				[73, "setenta e três centavos"],
				[74, "setenta e quatro centavos"],
				[75, "setenta e cinco centavos"],
				[76, "setenta e seis centavos"],
				[77, "setenta e sete centavos"],
				[78, "setenta e oito centavos"],
				[79, "setenta e nove centavos"],
				[80, "oitenta centavos"],
				[81, "oitenta e um centavos"],
				[82, "oitenta e dois centavos"],
				[83, "oitenta e três centavos"],
				[84, "oitenta e quatro centavos"],
				[85, "oitenta e cinco centavos"],
				[86, "oitenta e seis centavos"],
				[87, "oitenta e sete centavos"],
				[88, "oitenta e oito centavos"],
				[89, "oitenta e nove centavos"],
				[90, "noventa centavos"],
				[91, "noventa e um centavos"],
				[92, "noventa e dois centavos"],
				[93, "noventa e três centavos"],
				[94, "noventa e quatro centavos"],
				[95, "noventa e cinco centavos"],
				[96, "noventa e seis centavos"],
				[97, "noventa e sete centavos"],
				[98, "noventa e oito centavos"],
				[99, "noventa e nove centavos"],
				[100, "um real"],
				[101, "um real e um centavo"],
				[102, "um real e dois centavos"],
				[103, "um real e três centavos"],
				[104, "um real e quatro centavos"],
				[105, "um real e cinco centavos"],
				[106, "um real e seis centavos"],
				[107, "um real e sete centavos"],
				[108, "um real e oito centavos"],
				[109, "um real e nove centavos"],
				[110, "um real e dez centavos"],
				[111, "um real e onze centavos"],
				[112, "um real e doze centavos"],
				[113, "um real e treze centavos"],
				[114, "um real e catorze centavos"],
				[115, "um real e quinze centavos"],
				[116, "um real e dezesseis centavos"],
				[117, "um real e dezessete centavos"],
				[118, "um real e dezoito centavos"],
				[119, "um real e dezenove centavos"],
				[120, "um real e vinte centavos"],
				[121, "um real e vinte e um centavos"],
				[122, "um real e vinte e dois centavos"],
				[123, "um real e vinte e três centavos"],
				[124, "um real e vinte e quatro centavos"],
				[125, "um real e vinte e cinco centavos"],
				[126, "um real e vinte e seis centavos"],
				[127, "um real e vinte e sete centavos"],
				[128, "um real e vinte e oito centavos"],
				[129, "um real e vinte e nove centavos"],
				[130, "um real e trinta centavos"],
				[131, "um real e trinta e um centavos"],
				[132, "um real e trinta e dois centavos"],
				[133, "um real e trinta e três centavos"],
				[134, "um real e trinta e quatro centavos"],
				[135, "um real e trinta e cinco centavos"],
				[136, "um real e trinta e seis centavos"],
				[137, "um real e trinta e sete centavos"],
				[138, "um real e trinta e oito centavos"],
				[139, "um real e trinta e nove centavos"],
				[140, "um real e quarenta centavos"],
				[141, "um real e quarenta e um centavos"],
				[142, "um real e quarenta e dois centavos"],
				[143, "um real e quarenta e três centavos"],
				[144, "um real e quarenta e quatro centavos"],
				[145, "um real e quarenta e cinco centavos"],
				[146, "um real e quarenta e seis centavos"],
				[147, "um real e quarenta e sete centavos"],
				[148, "um real e quarenta e oito centavos"],
				[149, "um real e quarenta e nove centavos"],
			];

			expectAmounts(cases.map(([cents, expected]) => [cents / 100, expected]));
		});

		test("should match a hand-written string at reais boundaries, scale words and truncation cases", () => {
			const cases: [number, string][] = [
				[1000, "mil reais"],
				[1000.01, "mil reais e um centavo"],
				[1101, "mil, cento e um reais"],
				[1101.01, "mil, cento e um reais e um centavo"],
				[1523.45, "mil, quinhentos e vinte e três reais e quarenta e cinco centavos"],
				[1_000_000, "um milhão de reais"],
				[1_000_000.01, "um milhão de reais e um centavo"],
				[2_000_000, "dois milhões de reais"],
				[1_000_001, "um milhão e um reais"],
				[
					999_999_999_999_999,
					"novecentos e noventa e nove trilhões, novecentos e noventa e nove bilhões, novecentos e noventa e nove milhões, novecentos e noventa e nove mil, novecentos e noventa e nove reais",
				],
				[1.999, "um real e noventa e nove centavos"],
				[100.5, "cem reais e cinquenta centavos"],
				[2, "dois reais"],
				[10.5, "dez reais e cinquenta centavos"],
				[999_999, "novecentos e noventa e nove mil, novecentos e noventa e nove reais"],
				[100, "cem reais"],
				[1_000_000_000, "um bilhão de reais"],
				[2_000_000_000, "dois bilhões de reais"],
				[1_000_000_000_000, "um trilhão de reais"],
				[2_000_000_000_000, "dois trilhões de reais"],
			];
			expectAmounts(cases);
		});

		test("should reproduce every published brutils 'convert_real_to_text' example (tests/test_currency.py, lowercase here because brutils capitalizes and this library leaves casing to the caller)", () => {
			const cases: [number, string][] = [
				[0, "zero reais"],
				[0.01, "um centavo"],
				[0.5, "cinquenta centavos"],
				[1, "um real"],
				[-50.25, "menos cinquenta reais e vinte e cinco centavos"],
				[1523.45, "mil, quinhentos e vinte e três reais e quarenta e cinco centavos"],
				[1_000_000, "um milhão de reais"],
				[2_000_000, "dois milhões de reais"],
				[1_000_000_000, "um bilhão de reais"],
				[2_000_000_000, "dois bilhões de reais"],
				[1_000_000_000_000, "um trilhão de reais"],
				[2_000_000_000_000, "dois trilhões de reais"],
				[1_000_000.45, "um milhão de reais e quarenta e cinco centavos"],
				[2_000_000_000.99, "dois bilhões de reais e noventa e nove centavos"],
				[
					1_234_567_890.5,
					"um bilhão, duzentos e trinta e quatro milhões, quinhentos e sessenta e sete mil, oitocentos e noventa reais e cinquenta centavos",
				],
				[0.001, "zero reais"],
				[0.009, "zero reais"],
				[-1_000_000, "menos um milhão de reais"],
				[-2_000_000.5, "menos dois milhões de reais e cinquenta centavos"],
				[1_000_000_000.01, "um bilhão de reais e um centavo"],
				[1_000_000_000.99, "um bilhão de reais e noventa e nove centavos"],
				[
					999_999_999_999.99,
					"novecentos e noventa e nove bilhões, novecentos e noventa e nove milhões, novecentos e noventa e nove mil, novecentos e noventa e nove reais e noventa e nove centavos",
				],
				[1_000_000_000_000.01, "um trilhão de reais e um centavo"],
				[1_000_000_000_000.99, "um trilhão de reais e noventa e nove centavos"],
				[
					9_999_999_999_999.99,
					"nove trilhões, novecentos e noventa e nove bilhões, novecentos e noventa e nove milhões, novecentos e noventa e nove mil, novecentos e noventa e nove reais e noventa e nove centavos",
				],
			];
			expectAmounts(cases);
		});

		test("should prefix 'menos' to a hand-written string for negative amounts", () => {
			const cases: [number, string][] = [
				[-0.01, "menos um centavo"],
				[-1, "menos um real"],
				[-1.5, "menos um real e cinquenta centavos"],
				[-5.5, "menos cinco reais e cinquenta centavos"],
				[-100, "menos cem reais"],
				[-1_000_000, "menos um milhão de reais"],
				[-0.001, "zero reais"],
				[-0.009, "zero reais"],
			];
			expectAmounts(cases);
		});
	});
});
