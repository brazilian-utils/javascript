import { MONTH_NAMES, WEEKDAY_NAMES } from "../_internals/constants/number-words";
import { describe, expect, test } from "../_internals/test/runtime";
import { convertDateToWords } from "./convert-date-to-words";

describe("convertDateToWords", () => {
	test("should return 'primeiro' for day 1", () => {
		expect(convertDateToWords("01/01/2024")).toBe(
			"primeiro de janeiro de dois mil e vinte e quatro",
		);
	});

	test("should return the cardinal number for day 2", () => {
		expect(convertDateToWords("02/01/2024")).toBe("dois de janeiro de dois mil e vinte e quatro");
	});

	test("should accept a 'dd/mm/yyyy' string", () => {
		expect(convertDateToWords("25/12/2024")).toBe(
			"vinte e cinco de dezembro de dois mil e vinte e quatro",
		);
	});

	test("should accept an ISO 'yyyy-mm-dd' string", () => {
		expect(convertDateToWords("2024-12-25")).toBe(
			"vinte e cinco de dezembro de dois mil e vinte e quatro",
		);
	});

	test("should accept a Date read by its local calendar date", () => {
		expect(convertDateToWords(new Date(2024, 0, 1))).toBe(
			"primeiro de janeiro de dois mil e vinte e quatro",
		);
		expect(convertDateToWords(new Date(2024, 11, 25))).toBe(
			"vinte e cinco de dezembro de dois mil e vinte e quatro",
		);
	});

	test("should reject February 29th on a non-leap year", () => {
		expect(convertDateToWords("29/02/2023")).toBe("");
	});

	test("should reject a day that does not exist in the given month", () => {
		expect(convertDateToWords("31/04/2024")).toBe("");
	});

	test("should reject an out of range month", () => {
		expect(convertDateToWords("15/13/2024")).toBe("");
		expect(convertDateToWords("15/00/2024")).toBe("");
	});

	test("should reject an out of range day", () => {
		expect(convertDateToWords("00/01/2024")).toBe("");
		expect(convertDateToWords("32/01/2024")).toBe("");
	});

	describe("case option", () => {
		test("should keep the result lowercase by default", () => {
			expect(convertDateToWords("01/01/2024")).toBe(
				"primeiro de janeiro de dois mil e vinte e quatro",
			);
		});

		test("should keep the result lowercase for 'lower'", () => {
			expect(convertDateToWords("01/01/2024", { case: "lower" })).toBe(
				"primeiro de janeiro de dois mil e vinte e quatro",
			);
		});

		test("should capitalize only the first letter for 'sentence'", () => {
			expect(convertDateToWords("01/01/2024", { case: "sentence" })).toBe(
				"Primeiro de janeiro de dois mil e vinte e quatro",
			);
			expect(convertDateToWords("10/05/1999", { case: "sentence" })).toBe(
				"Dez de maio de mil novecentos e noventa e nove",
			);
		});

		test("should uppercase everything for 'upper', keeping accents", () => {
			expect(convertDateToWords("02/03/2024", { case: "upper" })).toBe(
				"DOIS DE MARÇO DE DOIS MIL E VINTE E QUATRO",
			);
		});

		test("should ignore an invalid case value and fall back to 'lower'", () => {
			expect(
				// @ts-expect-error
				convertDateToWords("01/01/2024", { case: "invalid" }),
			).toBe("primeiro de janeiro de dois mil e vinte e quatro");
		});

		test("should write only the month name and leave day/year as digits for 'month'", () => {
			expect(convertDateToWords("02/03/2024", { style: "month" })).toBe("2 de março de 2024");
		});

		test("should write day 1 as 'primeiro' in 'full' style and as '1º' in 'month' style", () => {
			expect(convertDateToWords("01/01/2024", { style: "full" })).toBe(
				"primeiro de janeiro de dois mil e vinte e quatro",
			);
			expect(convertDateToWords("01/01/2024", { style: "month" })).toBe("1º de janeiro de 2024");
		});

		test("should ignore an invalid style value and fall back to 'full'", () => {
			expect(
				// @ts-expect-error
				convertDateToWords("02/03/2024", { style: "invalid" }),
			).toBe("dois de março de dois mil e vinte e quatro");
		});

		test("should match a hand-written string for every month in both styles", () => {
			const cases: Array<[string, string, string]> = [
				["02/01/2024", "dois de janeiro de dois mil e vinte e quatro", "2 de janeiro de 2024"],
				["02/02/2024", "dois de fevereiro de dois mil e vinte e quatro", "2 de fevereiro de 2024"],
				["02/03/2024", "dois de março de dois mil e vinte e quatro", "2 de março de 2024"],
				["02/04/2024", "dois de abril de dois mil e vinte e quatro", "2 de abril de 2024"],
				["02/05/2024", "dois de maio de dois mil e vinte e quatro", "2 de maio de 2024"],
				["02/06/2024", "dois de junho de dois mil e vinte e quatro", "2 de junho de 2024"],
				["02/07/2024", "dois de julho de dois mil e vinte e quatro", "2 de julho de 2024"],
				["02/08/2024", "dois de agosto de dois mil e vinte e quatro", "2 de agosto de 2024"],
				["02/09/2024", "dois de setembro de dois mil e vinte e quatro", "2 de setembro de 2024"],
				["02/10/2024", "dois de outubro de dois mil e vinte e quatro", "2 de outubro de 2024"],
				["02/11/2024", "dois de novembro de dois mil e vinte e quatro", "2 de novembro de 2024"],
				["02/12/2024", "dois de dezembro de dois mil e vinte e quatro", "2 de dezembro de 2024"],
			];
			const failures: Array<{
				input: string;
				actualFull: string;
				expectedFull: string;
				actualMonth: string;
				expectedMonth: string;
			}> = [];

			for (const [input, expectedFull, expectedMonth] of cases) {
				const actualFull = convertDateToWords(input, { style: "full" });
				const actualMonth = convertDateToWords(input, { style: "month" });
				if (actualFull !== expectedFull || actualMonth !== expectedMonth) {
					failures.push({ input, actualFull, expectedFull, actualMonth, expectedMonth });
				}
			}

			expect(failures).toEqual([]);
		});
	});

	describe("weekday option", () => {
		test("should not prefix a weekday by default", () => {
			expect(convertDateToWords("02/03/2024")).toBe("dois de março de dois mil e vinte e quatro");
		});

		test("should list every weekday name in order (Date#getDay indexing)", () => {
			expect(WEEKDAY_NAMES).toEqual([
				"domingo",
				"segunda-feira",
				"terça-feira",
				"quarta-feira",
				"quinta-feira",
				"sexta-feira",
				"sábado",
			]);
		});

		test("should prefix the pt-BR weekday and a comma for 7 consecutive known dates", () => {
			const cases: Array<[string, string]> = [
				["03/03/2024", "domingo, três de março de dois mil e vinte e quatro"],
				["04/03/2024", "segunda-feira, quatro de março de dois mil e vinte e quatro"],
				["05/03/2024", "terça-feira, cinco de março de dois mil e vinte e quatro"],
				["06/03/2024", "quarta-feira, seis de março de dois mil e vinte e quatro"],
				["07/03/2024", "quinta-feira, sete de março de dois mil e vinte e quatro"],
				["08/03/2024", "sexta-feira, oito de março de dois mil e vinte e quatro"],
				["02/03/2024", "sábado, dois de março de dois mil e vinte e quatro"],
			];
			const failures: Array<{ input: string; actual: string; expected: string }> = [];

			for (const [input, expected] of cases) {
				const actual = convertDateToWords(input, { weekday: true });
				if (actual !== expected) failures.push({ input, actual, expected });
			}

			expect(failures).toEqual([]);
		});

		test("should compute the weekday from a Date's local calendar date", () => {
			expect(convertDateToWords(new Date(2024, 2, 2), { weekday: true })).toBe(
				"sábado, dois de março de dois mil e vinte e quatro",
			);
		});

		test("should combine with 'month' style", () => {
			expect(convertDateToWords("01/01/2024", { weekday: true, style: "month" })).toBe(
				"segunda-feira, 1º de janeiro de 2024",
			);
		});

		test("should combine with the 'case' option", () => {
			expect(convertDateToWords("02/03/2024", { weekday: true, case: "sentence" })).toBe(
				"Sábado, dois de março de dois mil e vinte e quatro",
			);
			expect(convertDateToWords("02/03/2024", { weekday: true, case: "upper" })).toBe(
				"SÁBADO, DOIS DE MARÇO DE DOIS MIL E VINTE E QUATRO",
			);
		});
	});

	describe("invalid input", () => {
		test("should return '' for an invalid Date", () => {
			expect(convertDateToWords(new Date("invalid"))).toBe("");
		});

		test("should return '' for a malformed string", () => {
			expect(convertDateToWords("2024/01/01")).toBe("");
			expect(convertDateToWords("01-01-2024")).toBe("");
			expect(convertDateToWords("not a date")).toBe("");
			expect(convertDateToWords("")).toBe("");
		});

		test("should return '' for a non-Date/non-string value", () => {
			// @ts-expect-error
			expect(convertDateToWords(null)).toBe("");
			// @ts-expect-error
			expect(convertDateToWords(undefined)).toBe("");
			// @ts-expect-error
			expect(convertDateToWords(20240101)).toBe("");
		});
	});

	describe("years outside the calendar", () => {
		test("should return '' for year zero, which has no year to write out", () => {
			expect(convertDateToWords("01/01/0000")).toBe("");
			expect(convertDateToWords("0000-01-01")).toBe("");
		});

		test("should return '' for a Date with a year before year 1 instead of a truncated string", () => {
			const beforeYearOne = new Date(2000, 0, 1);
			beforeYearOne.setFullYear(-500);

			expect(convertDateToWords(beforeYearOne)).toBe("");
		});
	});

	describe("leap years of the proleptic Gregorian calendar", () => {
		test("should accept February 29th on a year divisible by 400", () => {
			expect(convertDateToWords("29/02/2000")).toBe("vinte e nove de fevereiro de dois mil");
			expect(convertDateToWords("29/02/1600")).toBe(
				"vinte e nove de fevereiro de mil e seiscentos",
			);
		});

		test("should reject February 29th on a century that is not divisible by 400", () => {
			expect(convertDateToWords("29/02/1900")).toBe("");
			expect(convertDateToWords("29/02/2100")).toBe("");
			expect(convertDateToWords("29/02/1800")).toBe("");
		});

		test("should accept February 29th on a year of the first century divisible by 4", () => {
			expect(convertDateToWords("29/02/0004")).toBe("vinte e nove de fevereiro de quatro");
			expect(convertDateToWords("29/02/0096")).toBe("vinte e nove de fevereiro de noventa e seis");
		});

		test("should reject February 29th on a year of the first century not divisible by 4", () => {
			expect(convertDateToWords("29/02/0003")).toBe("");
			expect(convertDateToWords("29/02/0100")).toBe("");
		});
	});

	test("should list every month name in order", () => {
		expect(MONTH_NAMES).toEqual([
			"janeiro",
			"fevereiro",
			"março",
			"abril",
			"maio",
			"junho",
			"julho",
			"agosto",
			"setembro",
			"outubro",
			"novembro",
			"dezembro",
		]);
	});

	describe("literal case tables", () => {
		test("should match a hand-written string for the 1st and the 15th of every month", () => {
			const cases: Array<[string, string]> = [
				["01/01/2024", "primeiro de janeiro de dois mil e vinte e quatro"],
				["15/01/2024", "quinze de janeiro de dois mil e vinte e quatro"],
				["01/02/2024", "primeiro de fevereiro de dois mil e vinte e quatro"],
				["15/02/2024", "quinze de fevereiro de dois mil e vinte e quatro"],
				["01/03/2024", "primeiro de março de dois mil e vinte e quatro"],
				["15/03/2024", "quinze de março de dois mil e vinte e quatro"],
				["01/04/2024", "primeiro de abril de dois mil e vinte e quatro"],
				["15/04/2024", "quinze de abril de dois mil e vinte e quatro"],
				["01/05/2024", "primeiro de maio de dois mil e vinte e quatro"],
				["15/05/2024", "quinze de maio de dois mil e vinte e quatro"],
				["01/06/2024", "primeiro de junho de dois mil e vinte e quatro"],
				["15/06/2024", "quinze de junho de dois mil e vinte e quatro"],
				["01/07/2024", "primeiro de julho de dois mil e vinte e quatro"],
				["15/07/2024", "quinze de julho de dois mil e vinte e quatro"],
				["01/08/2024", "primeiro de agosto de dois mil e vinte e quatro"],
				["15/08/2024", "quinze de agosto de dois mil e vinte e quatro"],
				["01/09/2024", "primeiro de setembro de dois mil e vinte e quatro"],
				["15/09/2024", "quinze de setembro de dois mil e vinte e quatro"],
				["01/10/2024", "primeiro de outubro de dois mil e vinte e quatro"],
				["15/10/2024", "quinze de outubro de dois mil e vinte e quatro"],
				["01/11/2024", "primeiro de novembro de dois mil e vinte e quatro"],
				["15/11/2024", "quinze de novembro de dois mil e vinte e quatro"],
				["01/12/2024", "primeiro de dezembro de dois mil e vinte e quatro"],
				["15/12/2024", "quinze de dezembro de dois mil e vinte e quatro"],
			];
			const failures: Array<{ input: string; actual: string; expected: string }> = [];

			for (const [input, expected] of cases) {
				const actual = convertDateToWords(input);
				if (actual !== expected) failures.push({ input, actual, expected });
			}

			expect(failures).toEqual([]);
		});

		test("should match a hand-written string for every day of a 31 day month", () => {
			const cases: Array<[string, string]> = [
				["01/03/2024", "primeiro de março de dois mil e vinte e quatro"],
				["02/03/2024", "dois de março de dois mil e vinte e quatro"],
				["03/03/2024", "três de março de dois mil e vinte e quatro"],
				["04/03/2024", "quatro de março de dois mil e vinte e quatro"],
				["05/03/2024", "cinco de março de dois mil e vinte e quatro"],
				["06/03/2024", "seis de março de dois mil e vinte e quatro"],
				["07/03/2024", "sete de março de dois mil e vinte e quatro"],
				["08/03/2024", "oito de março de dois mil e vinte e quatro"],
				["09/03/2024", "nove de março de dois mil e vinte e quatro"],
				["10/03/2024", "dez de março de dois mil e vinte e quatro"],
				["11/03/2024", "onze de março de dois mil e vinte e quatro"],
				["12/03/2024", "doze de março de dois mil e vinte e quatro"],
				["13/03/2024", "treze de março de dois mil e vinte e quatro"],
				["14/03/2024", "catorze de março de dois mil e vinte e quatro"],
				["15/03/2024", "quinze de março de dois mil e vinte e quatro"],
				["16/03/2024", "dezesseis de março de dois mil e vinte e quatro"],
				["17/03/2024", "dezessete de março de dois mil e vinte e quatro"],
				["18/03/2024", "dezoito de março de dois mil e vinte e quatro"],
				["19/03/2024", "dezenove de março de dois mil e vinte e quatro"],
				["20/03/2024", "vinte de março de dois mil e vinte e quatro"],
				["21/03/2024", "vinte e um de março de dois mil e vinte e quatro"],
				["22/03/2024", "vinte e dois de março de dois mil e vinte e quatro"],
				["23/03/2024", "vinte e três de março de dois mil e vinte e quatro"],
				["24/03/2024", "vinte e quatro de março de dois mil e vinte e quatro"],
				["25/03/2024", "vinte e cinco de março de dois mil e vinte e quatro"],
				["26/03/2024", "vinte e seis de março de dois mil e vinte e quatro"],
				["27/03/2024", "vinte e sete de março de dois mil e vinte e quatro"],
				["28/03/2024", "vinte e oito de março de dois mil e vinte e quatro"],
				["29/03/2024", "vinte e nove de março de dois mil e vinte e quatro"],
				["30/03/2024", "trinta de março de dois mil e vinte e quatro"],
				["31/03/2024", "trinta e um de março de dois mil e vinte e quatro"],
			];
			const failures: Array<{ input: string; actual: string; expected: string }> = [];

			for (const [input, expected] of cases) {
				const actual = convertDateToWords(input);
				if (actual !== expected) failures.push({ input, actual, expected });
			}

			expect(failures).toEqual([]);
		});

		test("should reproduce every published brutils 'convert_date_to_text' example (tests/test_date_utils.py, lowercase here because brutils always capitalizes and this library exposes that as case: 'sentence')", () => {
			const cases: Array<[string, string]> = [
				["15/08/2024", "quinze de agosto de dois mil e vinte e quatro"],
				["01/01/2000", "primeiro de janeiro de dois mil"],
				["31/12/1999", "trinta e um de dezembro de mil novecentos e noventa e nove"],
				["29/02/2020", "vinte e nove de fevereiro de dois mil e vinte"],
				["01/01/1900", "primeiro de janeiro de mil e novecentos"],
			];
			const failures: Array<{ input: string; actual: string; expected: string }> = [];

			for (const [input, expected] of cases) {
				const actual = convertDateToWords(input);
				if (actual !== expected) failures.push({ input, actual, expected });
			}

			expect(failures).toEqual([]);
		});

		test("should match a hand-written string for day 31 and for the leap day", () => {
			const cases: Array<[string, string]> = [
				["31/01/2024", "trinta e um de janeiro de dois mil e vinte e quatro"],
				["29/02/2024", "vinte e nove de fevereiro de dois mil e vinte e quatro"],
			];
			const failures: Array<{ input: string; actual: string; expected: string }> = [];

			for (const [input, expected] of cases) {
				const actual = convertDateToWords(input);
				if (actual !== expected) failures.push({ input, actual, expected });
			}

			expect(failures).toEqual([]);
		});

		test("should render the year without the thousands comma for 1900, 1999, 2000, 2001, 2024 and 2100", () => {
			const cases: Array<[string, string]> = [
				["01/01/1101", "primeiro de janeiro de mil cento e um"],
				["01/01/1200", "primeiro de janeiro de mil e duzentos"],
				["01/01/1500", "primeiro de janeiro de mil e quinhentos"],
				["01/01/1900", "primeiro de janeiro de mil e novecentos"],
				["01/01/1999", "primeiro de janeiro de mil novecentos e noventa e nove"],
				["01/01/2000", "primeiro de janeiro de dois mil"],
				["01/01/2001", "primeiro de janeiro de dois mil e um"],
				["01/01/2024", "primeiro de janeiro de dois mil e vinte e quatro"],
				["01/01/2100", "primeiro de janeiro de dois mil e cem"],
				["10/05/1999", "dez de maio de mil novecentos e noventa e nove"],
			];
			const failures: Array<{ input: string; actual: string; expected: string }> = [];

			for (const [input, expected] of cases) {
				const actual = convertDateToWords(input);
				if (actual !== expected) failures.push({ input, actual, expected });
			}

			expect(failures).toEqual([]);
		});

		test("should give the same hand-written result for the 'dd/mm/yyyy' and the ISO form", () => {
			const cases: Array<[string, string]> = [
				["2024-01-02", "dois de janeiro de dois mil e vinte e quatro"],
				["1999-05-10", "dez de maio de mil novecentos e noventa e nove"],
			];
			const failures: Array<{ input: string; actual: string; expected: string }> = [];

			for (const [input, expected] of cases) {
				const actual = convertDateToWords(input);
				if (actual !== expected) failures.push({ input, actual, expected });
			}

			expect(failures).toEqual([]);
		});
	});
});
