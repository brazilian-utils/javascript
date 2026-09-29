import * as fc from "fast-check";

import {
	anyGarbage,
	anyText,
	anyValue,
	maskSeparators,
	processosJuridicos,
} from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isValidProcessoJuridico } from "../is-valid-processo-juridico/is-valid-processo-juridico";
import { PROCESSO_JURIDICO_SEGMENTS } from "./constants";
import {
	type ProcessoJuridicoInfo,
	type ProcessoJuridicoSegment,
	getProcessoJuridicoInfo,
} from "./get-processo-juridico-info";

const SEGMENTS: [string, ProcessoJuridicoInfo][] = [
	[
		"0000100-85.2008.1.00.0000",
		{
			sequentialNumber: "0000100",
			checkDigits: "85",
			year: 2008,
			segment: "supreme-federal-court",
			segmentCode: "1",
			tribunalCode: "00",
			originUnit: "0000",
		},
	],
	[
		"0000100-04.2008.2.00.0000",
		{
			sequentialNumber: "0000100",
			checkDigits: "04",
			year: 2008,
			segment: "national-council-of-justice",
			segmentCode: "2",
			tribunalCode: "00",
			originUnit: "0000",
		},
	],
	[
		"0000100-20.2008.3.00.0000",
		{
			sequentialNumber: "0000100",
			checkDigits: "20",
			year: 2008,
			segment: "superior-court-of-justice",
			segmentCode: "3",
			tribunalCode: "00",
			originUnit: "0000",
		},
	],
	[
		"0000100-09.2008.4.01.0000",
		{
			sequentialNumber: "0000100",
			checkDigits: "09",
			year: 2008,
			segment: "federal",
			segmentCode: "4",
			tribunalCode: "01",
			originUnit: "0000",
		},
	],
	[
		"0002080-25.2012.5.15.0049",
		{
			sequentialNumber: "0002080",
			checkDigits: "25",
			year: 2012,
			segment: "labor",
			segmentCode: "5",
			tribunalCode: "15",
			originUnit: "0049",
		},
	],
	[
		"0000100-18.2008.6.27.0000",
		{
			sequentialNumber: "0000100",
			checkDigits: "18",
			year: 2008,
			segment: "electoral",
			segmentCode: "6",
			tribunalCode: "27",
			originUnit: "0000",
		},
	],
	[
		"0000100-51.2008.7.12.0000",
		{
			sequentialNumber: "0000100",
			checkDigits: "51",
			year: 2008,
			segment: "military",
			segmentCode: "7",
			tribunalCode: "12",
			originUnit: "0000",
		},
	],
	[
		"0000100-73.2008.8.01.0000",
		{
			sequentialNumber: "0000100",
			checkDigits: "73",
			year: 2008,
			segment: "state",
			segmentCode: "8",
			tribunalCode: "01",
			originUnit: "0000",
		},
	],
	[
		"0000100-93.2008.9.26.0000",
		{
			sequentialNumber: "0000100",
			checkDigits: "93",
			year: 2008,
			segment: "state-military",
			segmentCode: "9",
			tribunalCode: "26",
			originUnit: "0000",
		},
	],
];

const SEGMENT_OF_COURT: Record<string, ProcessoJuridicoSegment> = {
	"1": "supreme-federal-court",
	"2": "national-council-of-justice",
	"3": "superior-court-of-justice",
	"4": "federal",
	"5": "labor",
	"6": "electoral",
	"7": "military",
	"8": "state",
	"9": "state-military",
};

describe("getProcessoJuridicoInfo", () => {
	describe("should return the fields of the number", () => {
		for (const [value, expected] of SEGMENTS) {
			test(`for ${value}, of the segment ${expected.segment}`, () => {
				expect(getProcessoJuridicoInfo(value)).toEqual(expected);
			});
		}

		test("for a value without the mask", () => {
			expect(getProcessoJuridicoInfo("00020802520125150049")).toEqual({
				sequentialNumber: "0002080",
				checkDigits: "25",
				year: 2012,
				segment: "labor",
				segmentCode: "5",
				tribunalCode: "15",
				originUnit: "0049",
			});
		});

		test("for a value with slashes, whitespace and no separator before the tribunal", () => {
			const expected = getProcessoJuridicoInfo("00020802520125150049");

			expect(getProcessoJuridicoInfo("0002080/25.2012.5.15.0049")).toEqual(expected);
			expect(getProcessoJuridicoInfo("0002080-25.2012.515.0049")).toEqual(expected);
			expect(getProcessoJuridicoInfo(" 0002080-25.2012.5.15.0049\n")).toEqual(expected);
		});

		test("for the TRF da 6ª Região, whose Anexo II example is 0000100-68.2008.4.06.0000", () => {
			expect(getProcessoJuridicoInfo("0000100-68.2008.4.06.0000")).toEqual({
				sequentialNumber: "0000100",
				checkDigits: "68",
				year: 2008,
				segment: "federal",
				segmentCode: "4",
				tribunalCode: "06",
				originUnit: "0000",
			});
		});

		test("for a council, whose tribunal code is 90", () => {
			expect(getProcessoJuridicoInfo("0000100-31.2008.4.90.0000")?.tribunalCode).toBe("90");
			expect(getProcessoJuridicoInfo("0000100-47.2008.5.90.0000")?.tribunalCode).toBe("90");
		});

		test("for the superior courts of the labor, electoral and military segments, whose tribunal code is 00", () => {
			expect(getProcessoJuridicoInfo("0000100-52.2008.5.00.0000")).toMatchObject({
				segment: "labor",
				tribunalCode: "00",
			});
			expect(getProcessoJuridicoInfo("0000100-68.2008.6.00.0000")).toMatchObject({
				segment: "electoral",
				tribunalCode: "00",
			});
			expect(getProcessoJuridicoInfo("0000100-84.2008.7.00.0000")).toMatchObject({
				segment: "military",
				tribunalCode: "00",
			});
		});

		test("for the tribunais de justiça militar of Minas Gerais and Rio Grande do Sul", () => {
			expect(getProcessoJuridicoInfo("0000100-56.2008.9.13.0000")?.tribunalCode).toBe("13");
			expect(getProcessoJuridicoInfo("0000100-34.2008.9.21.0000")?.tribunalCode).toBe("21");
		});

		test("with a year that is a number, not a string", () => {
			expect(typeof getProcessoJuridicoInfo("00020802520125150049")?.year).toBe("number");
		});

		test("as a new object on every call", () => {
			const first = getProcessoJuridicoInfo("00020802520125150049");
			const second = getProcessoJuridicoInfo("00020802520125150049");

			expect(first).not.toBe(second);

			// @ts-expect-error: the test corrupts its own copy
			first.year = 1999;

			expect(getProcessoJuridicoInfo("00020802520125150049")?.year).toBe(2012);
		});
	});

	describe("should return null", () => {
		test("when the check digits do not match", () => {
			expect(getProcessoJuridicoInfo("0002080-26.2012.5.15.0049")).toBeNull();
		});

		test("when the órgão and tribunal pair does not exist", () => {
			expect(getProcessoJuridicoInfo("0000100-23.2008.8.28.0000")).toBeNull();
			expect(getProcessoJuridicoInfo("0000100-68.2008.4.07.0000")).toBeNull();
		});

		test("when it is shorter or longer than 20 digits", () => {
			expect(getProcessoJuridicoInfo("0002080252012515004")).toBeNull();
			expect(getProcessoJuridicoInfo("000208025201251500490")).toBeNull();
		});

		test("when it carries a character outside the mask", () => {
			expect(getProcessoJuridicoInfo("ab00020802520125150049")).toBeNull();
			expect(getProcessoJuridicoInfo("0002080_25.2012.5.15.0049")).toBeNull();
		});

		test("when it is an empty string", () => {
			expect(getProcessoJuridicoInfo("")).toBeNull();
		});

		test("when it is null or undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getProcessoJuridicoInfo(null)).toBeNull();
			// @ts-expect-error: intentionally invalid input
			expect(getProcessoJuridicoInfo()).toBeNull();
		});

		test("when it is a number", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getProcessoJuridicoInfo(2_080_252_012_515)).toBeNull();
		});

		test("when it is an object or a key of the prototype chain", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getProcessoJuridicoInfo({})).toBeNull();
			expect(getProcessoJuridicoInfo("__proto__")).toBeNull();
		});
	});

	describe("properties", () => {
		test("should split a valid number into fields that spell it back, whatever mask it has", () => {
			fc.assert(
				fc.property(fc.gen(), maskSeparators([".", "-", " "], 5, 3), (g, separators) => {
					const value = g(processosJuridicos);
					const masked = `${value.slice(0, 7)}${separators[0]}${value.slice(7, 9)}${separators[1]}${value.slice(9, 13)}${separators[2]}${value.slice(13, 14)}${separators[3]}${value.slice(14, 16)}${separators[4]}${value.slice(16)}`;
					const info = getProcessoJuridicoInfo(masked);

					expect(info).not.toBeNull();
					expect(
						`${info?.sequentialNumber}${info?.checkDigits}${String(info?.year).padStart(4, "0")}${info?.segmentCode}${info?.tribunalCode}${info?.originUnit}`,
					).toBe(value);
				}),
			);
		});

		test("should name the segment of the órgão digit", () => {
			fc.assert(
				fc.property(fc.gen(), (g) => {
					const value = g(processosJuridicos);

					expect(getProcessoJuridicoInfo(value)?.segment).toBe(SEGMENT_OF_COURT[value.charAt(13)]);
				}),
			);
		});

		test("should return a value exactly when the number is valid", () => {
			fc.assert(
				fc.property(anyText, (value) => {
					expect(getProcessoJuridicoInfo(value) !== null).toBe(isValidProcessoJuridico(value));
				}),
			);
		});

		test("should never throw", () => {
			expectNeverThrows(getProcessoJuridicoInfo, anyValue);
			expectNeverThrows(getProcessoJuridicoInfo, anyGarbage);
		});
	});
});

describe("getProcessoJuridicoInfo types", () => {
	test("should take a string and return a ProcessoJuridicoInfo or null", () => {
		expectTypeOf(getProcessoJuridicoInfo).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(getProcessoJuridicoInfo).returns.toEqualTypeOf<ProcessoJuridicoInfo | null>();
		expectTypeOf<ProcessoJuridicoInfo>().toEqualTypeOf<{
			sequentialNumber: string;
			checkDigits: string;
			year: number;
			segment: ProcessoJuridicoSegment;
			segmentCode: string;
			tribunalCode: string;
			originUnit: string;
		}>();
	});

	test("should spell out the segments of the internal list", () => {
		expectTypeOf<ProcessoJuridicoSegment>().toEqualTypeOf<
			(typeof PROCESSO_JURIDICO_SEGMENTS)[number]
		>();
	});
});
