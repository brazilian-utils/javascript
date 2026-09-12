import { NUMBER_TO_WORDS_MAX_VALUE } from "../_internals/number-to-words/number-to-words";
import { describe, expect, test } from "../_internals/test/runtime";
import { convertNumberToWords, type ConvertNumberToWordsOptions } from "./convert-number-to-words";

function expectWords(
	cases: ReadonlyArray<readonly [number, string]>,
	options?: ConvertNumberToWordsOptions,
): void {
	const failures = cases.filter(
		([value, expected]) => convertNumberToWords(value, options) !== expected,
	);

	expect(failures).toEqual([]);
}

describe("convertNumberToWords", () => {
	test("should return 'zero' for 0", () => {
		expect(convertNumberToWords(0)).toBe("zero");
	});

	test("should return 'um' for 1", () => {
		expect(convertNumberToWords(1)).toBe("um");
	});

	test("should return 'cem' for 100 and 'cento e um' for 101", () => {
		expect(convertNumberToWords(100)).toBe("cem");
		expect(convertNumberToWords(101)).toBe("cento e um");
	});

	test("should return 'mil' alone for 1000, never 'um mil'", () => {
		expect(convertNumberToWords(1000)).toBe("mil");
	});

	test("should return 'um milhão' for 1000000, never 'um milhão e zero'", () => {
		expect(convertNumberToWords(1_000_000)).toBe("um milhão");
	});

	test("should convert the maximum supported value (999999999999999, 999 trillion)", () => {
		expect(convertNumberToWords(NUMBER_TO_WORDS_MAX_VALUE)).toBe(
			"novecentos e noventa e nove trilhões, novecentos e noventa e nove bilhões, " +
				"novecentos e noventa e nove milhões, novecentos e noventa e nove mil, " +
				"novecentos e noventa e nove",
		);
	});

	test("should return '' above the maximum supported value", () => {
		expect(convertNumberToWords(NUMBER_TO_WORDS_MAX_VALUE + 1)).toBe("");
	});

	test("should return '' below the negative of the maximum supported value", () => {
		expect(convertNumberToWords(-NUMBER_TO_WORDS_MAX_VALUE - 1)).toBe("");
	});

	test("should not prefix 'menos' for negative zero", () => {
		expect(convertNumberToWords(-0)).toBe("zero");
	});

	describe("invalid input", () => {
		test("should return '' for NaN", () => {
			expect(convertNumberToWords(Number.NaN)).toBe("");
		});

		test("should return '' for Infinity and -Infinity", () => {
			expect(convertNumberToWords(Number.POSITIVE_INFINITY)).toBe("");
			expect(convertNumberToWords(Number.NEGATIVE_INFINITY)).toBe("");
		});

		test("should return '' for a non-number value", () => {
			// @ts-expect-error
			expect(convertNumberToWords("123")).toBe("");
			// @ts-expect-error
			expect(convertNumberToWords(null)).toBe("");
			// @ts-expect-error
			expect(convertNumberToWords(undefined)).toBe("");
		});
	});

	describe("non-integer values", () => {
		test("should truncate toward zero before converting", () => {
			expect(convertNumberToWords(12.9)).toBe("doze");
			expect(convertNumberToWords(-12.9)).toBe("menos doze");
		});
	});

	describe("case option", () => {
		test("should keep the result lowercase by default", () => {
			expect(convertNumberToWords(123)).toBe("cento e vinte e três");
		});

		test("should keep the result lowercase for 'lower'", () => {
			expect(convertNumberToWords(123, { case: "lower" })).toBe("cento e vinte e três");
		});

		test("should capitalize only the first letter for 'sentence'", () => {
			expect(convertNumberToWords(123, { case: "sentence" })).toBe("Cento e vinte e três");
			expect(convertNumberToWords(3, { case: "sentence" })).toBe("Três");
		});

		test("should uppercase everything for 'upper', keeping accents", () => {
			expect(convertNumberToWords(3, { case: "upper" })).toBe("TRÊS");
			expect(convertNumberToWords(50, { case: "upper" })).toBe("CINQUENTA");
			expect(convertNumberToWords(-3, { case: "upper" })).toBe("MENOS TRÊS");
		});

		test("should ignore an invalid case value and fall back to 'lower'", () => {
			// @ts-expect-error
			expect(convertNumberToWords(123, { case: "invalid" })).toBe("cento e vinte e três");
		});
	});

	describe("literal case tables", () => {
		test("should match a hand-written word for every integer from 31 to 200 (masculine)", () => {
			const cases: Array<[number, string]> = [
				[31, "trinta e um"],
				[32, "trinta e dois"],
				[33, "trinta e três"],
				[34, "trinta e quatro"],
				[35, "trinta e cinco"],
				[36, "trinta e seis"],
				[37, "trinta e sete"],
				[38, "trinta e oito"],
				[39, "trinta e nove"],
				[40, "quarenta"],
				[41, "quarenta e um"],
				[42, "quarenta e dois"],
				[43, "quarenta e três"],
				[44, "quarenta e quatro"],
				[45, "quarenta e cinco"],
				[46, "quarenta e seis"],
				[47, "quarenta e sete"],
				[48, "quarenta e oito"],
				[49, "quarenta e nove"],
				[50, "cinquenta"],
				[51, "cinquenta e um"],
				[52, "cinquenta e dois"],
				[53, "cinquenta e três"],
				[54, "cinquenta e quatro"],
				[55, "cinquenta e cinco"],
				[56, "cinquenta e seis"],
				[57, "cinquenta e sete"],
				[58, "cinquenta e oito"],
				[59, "cinquenta e nove"],
				[60, "sessenta"],
				[61, "sessenta e um"],
				[62, "sessenta e dois"],
				[63, "sessenta e três"],
				[64, "sessenta e quatro"],
				[65, "sessenta e cinco"],
				[66, "sessenta e seis"],
				[67, "sessenta e sete"],
				[68, "sessenta e oito"],
				[69, "sessenta e nove"],
				[70, "setenta"],
				[71, "setenta e um"],
				[72, "setenta e dois"],
				[73, "setenta e três"],
				[74, "setenta e quatro"],
				[75, "setenta e cinco"],
				[76, "setenta e seis"],
				[77, "setenta e sete"],
				[78, "setenta e oito"],
				[79, "setenta e nove"],
				[80, "oitenta"],
				[81, "oitenta e um"],
				[82, "oitenta e dois"],
				[83, "oitenta e três"],
				[84, "oitenta e quatro"],
				[85, "oitenta e cinco"],
				[86, "oitenta e seis"],
				[87, "oitenta e sete"],
				[88, "oitenta e oito"],
				[89, "oitenta e nove"],
				[90, "noventa"],
				[91, "noventa e um"],
				[92, "noventa e dois"],
				[93, "noventa e três"],
				[94, "noventa e quatro"],
				[95, "noventa e cinco"],
				[96, "noventa e seis"],
				[97, "noventa e sete"],
				[98, "noventa e oito"],
				[99, "noventa e nove"],
				[100, "cem"],
				[101, "cento e um"],
				[102, "cento e dois"],
				[103, "cento e três"],
				[104, "cento e quatro"],
				[105, "cento e cinco"],
				[106, "cento e seis"],
				[107, "cento e sete"],
				[108, "cento e oito"],
				[109, "cento e nove"],
				[110, "cento e dez"],
				[111, "cento e onze"],
				[112, "cento e doze"],
				[113, "cento e treze"],
				[114, "cento e catorze"],
				[115, "cento e quinze"],
				[116, "cento e dezesseis"],
				[117, "cento e dezessete"],
				[118, "cento e dezoito"],
				[119, "cento e dezenove"],
				[120, "cento e vinte"],
				[121, "cento e vinte e um"],
				[122, "cento e vinte e dois"],
				[123, "cento e vinte e três"],
				[124, "cento e vinte e quatro"],
				[125, "cento e vinte e cinco"],
				[126, "cento e vinte e seis"],
				[127, "cento e vinte e sete"],
				[128, "cento e vinte e oito"],
				[129, "cento e vinte e nove"],
				[130, "cento e trinta"],
				[131, "cento e trinta e um"],
				[132, "cento e trinta e dois"],
				[133, "cento e trinta e três"],
				[134, "cento e trinta e quatro"],
				[135, "cento e trinta e cinco"],
				[136, "cento e trinta e seis"],
				[137, "cento e trinta e sete"],
				[138, "cento e trinta e oito"],
				[139, "cento e trinta e nove"],
				[140, "cento e quarenta"],
				[141, "cento e quarenta e um"],
				[142, "cento e quarenta e dois"],
				[143, "cento e quarenta e três"],
				[144, "cento e quarenta e quatro"],
				[145, "cento e quarenta e cinco"],
				[146, "cento e quarenta e seis"],
				[147, "cento e quarenta e sete"],
				[148, "cento e quarenta e oito"],
				[149, "cento e quarenta e nove"],
				[150, "cento e cinquenta"],
				[151, "cento e cinquenta e um"],
				[152, "cento e cinquenta e dois"],
				[153, "cento e cinquenta e três"],
				[154, "cento e cinquenta e quatro"],
				[155, "cento e cinquenta e cinco"],
				[156, "cento e cinquenta e seis"],
				[157, "cento e cinquenta e sete"],
				[158, "cento e cinquenta e oito"],
				[159, "cento e cinquenta e nove"],
				[160, "cento e sessenta"],
				[161, "cento e sessenta e um"],
				[162, "cento e sessenta e dois"],
				[163, "cento e sessenta e três"],
				[164, "cento e sessenta e quatro"],
				[165, "cento e sessenta e cinco"],
				[166, "cento e sessenta e seis"],
				[167, "cento e sessenta e sete"],
				[168, "cento e sessenta e oito"],
				[169, "cento e sessenta e nove"],
				[170, "cento e setenta"],
				[171, "cento e setenta e um"],
				[172, "cento e setenta e dois"],
				[173, "cento e setenta e três"],
				[174, "cento e setenta e quatro"],
				[175, "cento e setenta e cinco"],
				[176, "cento e setenta e seis"],
				[177, "cento e setenta e sete"],
				[178, "cento e setenta e oito"],
				[179, "cento e setenta e nove"],
				[180, "cento e oitenta"],
				[181, "cento e oitenta e um"],
				[182, "cento e oitenta e dois"],
				[183, "cento e oitenta e três"],
				[184, "cento e oitenta e quatro"],
				[185, "cento e oitenta e cinco"],
				[186, "cento e oitenta e seis"],
				[187, "cento e oitenta e sete"],
				[188, "cento e oitenta e oito"],
				[189, "cento e oitenta e nove"],
				[190, "cento e noventa"],
				[191, "cento e noventa e um"],
				[192, "cento e noventa e dois"],
				[193, "cento e noventa e três"],
				[194, "cento e noventa e quatro"],
				[195, "cento e noventa e cinco"],
				[196, "cento e noventa e seis"],
				[197, "cento e noventa e sete"],
				[198, "cento e noventa e oito"],
				[199, "cento e noventa e nove"],
				[200, "duzentos"],
			];
			expectWords(cases);
		});

		test("should match a hand-written word for every round hundred and the hundred that follows it", () => {
			const cases: Array<[number, string]> = [
				[100, "cem"],
				[101, "cento e um"],
				[200, "duzentos"],
				[201, "duzentos e um"],
				[300, "trezentos"],
				[301, "trezentos e um"],
				[400, "quatrocentos"],
				[401, "quatrocentos e um"],
				[500, "quinhentos"],
				[501, "quinhentos e um"],
				[600, "seiscentos"],
				[601, "seiscentos e um"],
				[700, "setecentos"],
				[701, "setecentos e um"],
				[800, "oitocentos"],
				[801, "oitocentos e um"],
				[900, "novecentos"],
				[901, "novecentos e um"],
				[999, "novecentos e noventa e nove"],
			];
			expectWords(cases);
		});

		test("should match a hand-written word at every ten/hundred/thousand/scale boundary", () => {
			const cases: Array<[number, string]> = [
				[999, "novecentos e noventa e nove"],
				[1000, "mil"],
				[1001, "mil e um"],
				[1021, "mil e vinte e um"],
				[1100, "mil e cem"],
				[1101, "mil, cento e um"],
				[1200, "mil e duzentos"],
				[1235, "mil, duzentos e trinta e cinco"],
				[1999, "mil, novecentos e noventa e nove"],
				[2000, "dois mil"],
				[2001, "dois mil e um"],
				[5000, "cinco mil"],
				[9999, "nove mil, novecentos e noventa e nove"],
				[10000, "dez mil"],
				[21000, "vinte e um mil"],
				[100000, "cem mil"],
				[101000, "cento e um mil"],
				[200000, "duzentos mil"],
				[300000, "trezentos mil"],
				[999999, "novecentos e noventa e nove mil, novecentos e noventa e nove"],
				[1000000, "um milhão"],
				[1000001, "um milhão e um"],
				[1000100, "um milhão e cem"],
				[1000230, "um milhão, duzentos e trinta"],
				[1045678, "um milhão, quarenta e cinco mil, seiscentos e setenta e oito"],
				[1100000, "um milhão e cem mil"],
				[1200000, "um milhão e duzentos mil"],
				[1230000, "um milhão, duzentos e trinta mil"],
				[1230045, "um milhão, duzentos e trinta mil e quarenta e cinco"],
				[1230456, "um milhão, duzentos e trinta mil, quatrocentos e cinquenta e seis"],
				[2000000, "dois milhões"],
				[1000000000, "um bilhão"],
				[1000000001, "um bilhão e um"],
				[2000000000, "dois bilhões"],
				[
					1234567890,
					"um bilhão, duzentos e trinta e quatro milhões, quinhentos e sessenta e sete mil, oitocentos e noventa",
				],
				[
					999999999999,
					"novecentos e noventa e nove bilhões, novecentos e noventa e nove milhões, novecentos e noventa e nove mil, novecentos e noventa e nove",
				],
				[1000000000000, "um trilhão"],
				[2000000000000, "dois trilhões"],
				[
					999999999999999,
					"novecentos e noventa e nove trilhões, novecentos e noventa e nove bilhões, novecentos e noventa e nove milhões, novecentos e noventa e nove mil, novecentos e noventa e nove",
				],
			];
			expectWords(cases);
		});

		test("should prefix 'menos' to a hand-written word for every integer from -1 to -100", () => {
			const cases: Array<[number, string]> = [
				[-1, "menos um"],
				[-2, "menos dois"],
				[-3, "menos três"],
				[-4, "menos quatro"],
				[-5, "menos cinco"],
				[-6, "menos seis"],
				[-7, "menos sete"],
				[-8, "menos oito"],
				[-9, "menos nove"],
				[-10, "menos dez"],
				[-11, "menos onze"],
				[-12, "menos doze"],
				[-13, "menos treze"],
				[-14, "menos catorze"],
				[-15, "menos quinze"],
				[-16, "menos dezesseis"],
				[-17, "menos dezessete"],
				[-18, "menos dezoito"],
				[-19, "menos dezenove"],
				[-20, "menos vinte"],
				[-21, "menos vinte e um"],
				[-22, "menos vinte e dois"],
				[-23, "menos vinte e três"],
				[-24, "menos vinte e quatro"],
				[-25, "menos vinte e cinco"],
				[-26, "menos vinte e seis"],
				[-27, "menos vinte e sete"],
				[-28, "menos vinte e oito"],
				[-29, "menos vinte e nove"],
				[-30, "menos trinta"],
				[-31, "menos trinta e um"],
				[-32, "menos trinta e dois"],
				[-33, "menos trinta e três"],
				[-34, "menos trinta e quatro"],
				[-35, "menos trinta e cinco"],
				[-36, "menos trinta e seis"],
				[-37, "menos trinta e sete"],
				[-38, "menos trinta e oito"],
				[-39, "menos trinta e nove"],
				[-40, "menos quarenta"],
				[-41, "menos quarenta e um"],
				[-42, "menos quarenta e dois"],
				[-43, "menos quarenta e três"],
				[-44, "menos quarenta e quatro"],
				[-45, "menos quarenta e cinco"],
				[-46, "menos quarenta e seis"],
				[-47, "menos quarenta e sete"],
				[-48, "menos quarenta e oito"],
				[-49, "menos quarenta e nove"],
				[-50, "menos cinquenta"],
				[-51, "menos cinquenta e um"],
				[-52, "menos cinquenta e dois"],
				[-53, "menos cinquenta e três"],
				[-54, "menos cinquenta e quatro"],
				[-55, "menos cinquenta e cinco"],
				[-56, "menos cinquenta e seis"],
				[-57, "menos cinquenta e sete"],
				[-58, "menos cinquenta e oito"],
				[-59, "menos cinquenta e nove"],
				[-60, "menos sessenta"],
				[-61, "menos sessenta e um"],
				[-62, "menos sessenta e dois"],
				[-63, "menos sessenta e três"],
				[-64, "menos sessenta e quatro"],
				[-65, "menos sessenta e cinco"],
				[-66, "menos sessenta e seis"],
				[-67, "menos sessenta e sete"],
				[-68, "menos sessenta e oito"],
				[-69, "menos sessenta e nove"],
				[-70, "menos setenta"],
				[-71, "menos setenta e um"],
				[-72, "menos setenta e dois"],
				[-73, "menos setenta e três"],
				[-74, "menos setenta e quatro"],
				[-75, "menos setenta e cinco"],
				[-76, "menos setenta e seis"],
				[-77, "menos setenta e sete"],
				[-78, "menos setenta e oito"],
				[-79, "menos setenta e nove"],
				[-80, "menos oitenta"],
				[-81, "menos oitenta e um"],
				[-82, "menos oitenta e dois"],
				[-83, "menos oitenta e três"],
				[-84, "menos oitenta e quatro"],
				[-85, "menos oitenta e cinco"],
				[-86, "menos oitenta e seis"],
				[-87, "menos oitenta e sete"],
				[-88, "menos oitenta e oito"],
				[-89, "menos oitenta e nove"],
				[-90, "menos noventa"],
				[-91, "menos noventa e um"],
				[-92, "menos noventa e dois"],
				[-93, "menos noventa e três"],
				[-94, "menos noventa e quatro"],
				[-95, "menos noventa e cinco"],
				[-96, "menos noventa e seis"],
				[-97, "menos noventa e sete"],
				[-98, "menos noventa e oito"],
				[-99, "menos noventa e nove"],
				[-100, "menos cem"],
			];
			expectWords(cases);
		});

		test("should prefix 'menos' to a hand-written word at negative scale boundaries", () => {
			const cases: Array<[number, string]> = [
				[-200, "menos duzentos"],
				[-999, "menos novecentos e noventa e nove"],
				[-1000, "menos mil"],
				[-1001, "menos mil e um"],
				[-2000, "menos dois mil"],
				[-1000000, "menos um milhão"],
				[
					-999999999999999,
					"menos novecentos e noventa e nove trilhões, novecentos e noventa e nove bilhões, novecentos e noventa e nove milhões, novecentos e noventa e nove mil, novecentos e noventa e nove",
				],
			];
			expectWords(cases);
		});

		test("should match a hand-written feminine word for every integer from 0 to 30", () => {
			const cases: Array<[number, string]> = [
				[0, "zero"],
				[1, "uma"],
				[2, "duas"],
				[3, "três"],
				[4, "quatro"],
				[5, "cinco"],
				[6, "seis"],
				[7, "sete"],
				[8, "oito"],
				[9, "nove"],
				[10, "dez"],
				[11, "onze"],
				[12, "doze"],
				[13, "treze"],
				[14, "catorze"],
				[15, "quinze"],
				[16, "dezesseis"],
				[17, "dezessete"],
				[18, "dezoito"],
				[19, "dezenove"],
				[20, "vinte"],
				[21, "vinte e uma"],
				[22, "vinte e duas"],
				[23, "vinte e três"],
				[24, "vinte e quatro"],
				[25, "vinte e cinco"],
				[26, "vinte e seis"],
				[27, "vinte e sete"],
				[28, "vinte e oito"],
				[29, "vinte e nove"],
				[30, "trinta"],
			];

			expectWords(cases, { gender: "feminine" });
		});

		test("should match a hand-written feminine word at hundred/thousand/million boundaries", () => {
			const cases: Array<[number, string]> = [
				[100, "cem"],
				[101, "cento e uma"],
				[200, "duzentas"],
				[201, "duzentas e uma"],
				[300, "trezentas"],
				[400, "quatrocentas"],
				[500, "quinhentas"],
				[600, "seiscentas"],
				[700, "setecentas"],
				[800, "oitocentas"],
				[900, "novecentas"],
				[1000, "mil"],
				[1001, "mil e uma"],
				[1100, "mil e cem"],
				[1101, "mil, cento e uma"],
				[2000, "duas mil"],
				[2002, "duas mil e duas"],
				[3000, "três mil"],
				[21000, "vinte e uma mil"],
				[100000, "cem mil"],
				[200000, "duzentas mil"],
				[300000, "trezentas mil"],
				[1000000, "um milhão"],
				[1000001, "um milhão e uma"],
				[2000000, "dois milhões"],
				[2000002, "dois milhões e duas"],
			];

			expectWords(cases, { gender: "feminine" });
		});
	});
});
