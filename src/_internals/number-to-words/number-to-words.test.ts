import { describe, expect, test } from "../test/runtime";
import { NUMBER_TO_WORDS_MAX_VALUE, numberToWords } from "./number-to-words";

describe("numberToWords", () => {
	test("should return 'zero' for 0", () => {
		expect(numberToWords(0)).toBe("zero");
	});

	test("should return 'um' for 1", () => {
		expect(numberToWords(1)).toBe("um");
	});

	test("should convert every teen number (10-19)", () => {
		expect(numberToWords(10)).toBe("dez");
		expect(numberToWords(11)).toBe("onze");
		expect(numberToWords(12)).toBe("doze");
		expect(numberToWords(13)).toBe("treze");
		expect(numberToWords(14)).toBe("catorze");
		expect(numberToWords(15)).toBe("quinze");
		expect(numberToWords(16)).toBe("dezesseis");
		expect(numberToWords(17)).toBe("dezessete");
		expect(numberToWords(18)).toBe("dezoito");
		expect(numberToWords(19)).toBe("dezenove");
	});

	test("should join tens and units with 'e' (21 -> num2words pt_BR 'vinte e um')", () => {
		expect(numberToWords(21)).toBe("vinte e um");
	});

	test("should return 'cem' for the exact hundred (100)", () => {
		expect(numberToWords(100)).toBe("cem");
	});

	test("should return 'cento e um' for 101 (num2words pt_BR)", () => {
		expect(numberToWords(101)).toBe("cento e um");
	});

	test("should return 'duzentos' for the exact round hundred (200)", () => {
		expect(numberToWords(200)).toBe("duzentos");
	});

	test("should return 'mil' alone for 1000, never 'um mil'", () => {
		expect(numberToWords(1000)).toBe("mil");
	});

	test("should join 'mil' and a unit with 'e' (1001 -> 'mil e um')", () => {
		expect(numberToWords(1001)).toBe("mil e um");
	});

	test("should join 'mil' and a round hundred with 'e' (1100 -> 'mil e cem')", () => {
		expect(numberToWords(1100)).toBe("mil e cem");
	});

	test("should separate 'mil' from a non round last group with a comma (1235 -> num2words pt_BR 'mil, duzentos e trinta e cinco')", () => {
		expect(numberToWords(1235)).toBe("mil, duzentos e trinta e cinco");
	});

	test("should return 'dois mil' for 2000 (masculine default)", () => {
		expect(numberToWords(2000)).toBe("dois mil");
	});

	test("should return 'um milhão' for 1000000, never 'um milhão e zero'", () => {
		expect(numberToWords(1_000_000)).toBe("um milhão");
	});

	test("should pluralize to 'milhões' for 2000000", () => {
		expect(numberToWords(2_000_000)).toBe("dois milhões");
	});

	test("should join 'um milhão' and a trailing unit with 'e' (1000001)", () => {
		expect(numberToWords(1_000_001)).toBe("um milhão e um");
	});

	test("should convert the maximum supported value (999 trillion, num2words pt_BR)", () => {
		expect(numberToWords(NUMBER_TO_WORDS_MAX_VALUE)).toBe(
			"novecentos e noventa e nove trilhões, novecentos e noventa e nove bilhões, " +
				"novecentos e noventa e nove milhões, novecentos e noventa e nove mil, " +
				"novecentos e noventa e nove",
		);
	});

	test("should convert a value spanning billions, millions and thousands (999999999999, num2words pt_BR)", () => {
		expect(numberToWords(999_999_999_999)).toBe(
			"novecentos e noventa e nove bilhões, novecentos e noventa e nove milhões, " +
				"novecentos e noventa e nove mil, novecentos e noventa e nove",
		);
	});

	test("should skip a zero intermediate group (1000230 -> no 'zero mil')", () => {
		expect(numberToWords(1_000_230)).toBe("um milhão, duzentos e trinta");
	});

	test("should separate an intermediate group below 100 with a comma, reserving 'e' for the last group (1045678; num2words pt_BR differs here only because its post-processing rewrites ' e ' before a hundreds word)", () => {
		expect(numberToWords(1_045_678)).toBe(
			"um milhão, quarenta e cinco mil, seiscentos e setenta e oito",
		);
	});

	describe("gender agreement", () => {
		test("should return 'uma' and 'duas' for 1 and 2 when feminine", () => {
			expect(numberToWords(1, { gender: "feminine" })).toBe("uma");
			expect(numberToWords(2, { gender: "feminine" })).toBe("duas");
		});

		test("should return the '-entas' hundreds form when feminine", () => {
			expect(numberToWords(200, { gender: "feminine" })).toBe("duzentas");
			expect(numberToWords(202, { gender: "feminine" })).toBe("duzentas e duas");
		});

		test("should keep 'cem'/'cento' invariant regardless of gender", () => {
			expect(numberToWords(100, { gender: "feminine" })).toBe("cem");
			expect(numberToWords(101, { gender: "feminine" })).toBe("cento e uma");
		});

		test("should agree the thousands multiplier with the feminine gender (2000 -> 'duas mil')", () => {
			expect(numberToWords(2000, { gender: "feminine" })).toBe("duas mil");
		});

		test("should agree the hundreds of the thousands group with the feminine gender (200000 -> 'duzentas mil')", () => {
			expect(numberToWords(200_000, { gender: "feminine" })).toBe("duzentas mil");
			expect(numberToWords(100_000, { gender: "feminine" })).toBe("cem mil");
		});

		test("should keep the million multiplier masculine regardless of gender (it agrees with 'milhão')", () => {
			expect(numberToWords(2_000_000, { gender: "feminine" })).toBe("dois milhões");
		});
	});
});
