import * as fc from "fast-check";

import { CNPJ_LENGTH } from "../_internals/constants/cnpj";
import { anyValue, digits, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectPadsToLength,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseCnpj } from "../parse-cnpj/parse-cnpj";
import { formatCnpj, type FormatCnpjOptions } from "./format-cnpj";

describe("formatCnpj", () => {
	it("should return an empty string for null or undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatCnpj(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatCnpj()).toBe("");
	});

	it("should format cnpj with mask", () => {
		expect(formatCnpj("")).toBe("");
		expect(formatCnpj("4")).toBe("4");
		expect(formatCnpj("46")).toBe("46");
		expect(formatCnpj("468")).toBe("46.8");
		expect(formatCnpj("4684")).toBe("46.84");
		expect(formatCnpj("46843")).toBe("46.843");
		expect(formatCnpj("468434")).toBe("46.843.4");
		expect(formatCnpj("4684348")).toBe("46.843.48");
		expect(formatCnpj("46843485")).toBe("46.843.485");
		expect(formatCnpj("468434850")).toBe("46.843.485/0");
		expect(formatCnpj("4684348500")).toBe("46.843.485/00");
		expect(formatCnpj("46843485000")).toBe("46.843.485/000");
		expect(formatCnpj("468434850001")).toBe("46.843.485/0001");
		expect(formatCnpj("4684348500018")).toBe("46.843.485/0001-8");
		expect(formatCnpj("46843485000186")).toBe("46.843.485/0001-86");
	});

	it("should format number cnpj with mask", () => {
		expect(formatCnpj(4)).toBe("4");
		expect(formatCnpj(46)).toBe("46");
		expect(formatCnpj(468)).toBe("46.8");
		expect(formatCnpj(4684)).toBe("46.84");
		expect(formatCnpj(46_843)).toBe("46.843");
		expect(formatCnpj(468_434)).toBe("46.843.4");
		expect(formatCnpj(4_684_348)).toBe("46.843.48");
		expect(formatCnpj(46_843_485)).toBe("46.843.485");
		expect(formatCnpj(468_434_850)).toBe("46.843.485/0");
		expect(formatCnpj(4_684_348_500)).toBe("46.843.485/00");
		expect(formatCnpj(46_843_485_000)).toBe("46.843.485/000");
		expect(formatCnpj(468_434_850_001)).toBe("46.843.485/0001");
		expect(formatCnpj(4_684_348_500_018)).toBe("46.843.485/0001-8");
		expect(formatCnpj(46_843_485_000_186)).toBe("46.843.485/0001-86");
	});

	it("should format cnpj with mask filling zeroes", () => {
		expect(formatCnpj("", { pad: true })).toBe("00.000.000/0000-00");
		expect(formatCnpj("4", { pad: true })).toBe("00.000.000/0000-04");
		expect(formatCnpj("46", { pad: true })).toBe("00.000.000/0000-46");
		expect(formatCnpj("468", { pad: true })).toBe("00.000.000/0004-68");
		expect(formatCnpj("4684", { pad: true })).toBe("00.000.000/0046-84");
		expect(formatCnpj("46843", { pad: true })).toBe("00.000.000/0468-43");
		expect(formatCnpj("468434", { pad: true })).toBe("00.000.000/4684-34");
		expect(formatCnpj("4684348", { pad: true })).toBe("00.000.004/6843-48");
		expect(formatCnpj("46843485", { pad: true })).toBe("00.000.046/8434-85");
		expect(formatCnpj("468434850", { pad: true })).toBe("00.000.468/4348-50");
		expect(formatCnpj("4684348500", { pad: true })).toBe("00.004.684/3485-00");
		expect(formatCnpj("46843485000", { pad: true })).toBe("00.046.843/4850-00");
		expect(formatCnpj("468434850001", { pad: true })).toBe("00.468.434/8500-01");
		expect(formatCnpj("4684348500018", { pad: true })).toBe("04.684.348/5000-18");
		expect(formatCnpj("46843485000186", { pad: true })).toBe("46.843.485/0001-86");
	});

	it("should format number cnpj with mask filling zeroes", () => {
		expect(formatCnpj(4, { pad: true })).toBe("00.000.000/0000-04");
		expect(formatCnpj(46, { pad: true })).toBe("00.000.000/0000-46");
		expect(formatCnpj(468, { pad: true })).toBe("00.000.000/0004-68");
		expect(formatCnpj(4684, { pad: true })).toBe("00.000.000/0046-84");
		expect(formatCnpj(46_843, { pad: true })).toBe("00.000.000/0468-43");
		expect(formatCnpj(468_434, { pad: true })).toBe("00.000.000/4684-34");
		expect(formatCnpj(4_684_348, { pad: true })).toBe("00.000.004/6843-48");
		expect(formatCnpj(46_843_485, { pad: true })).toBe("00.000.046/8434-85");
		expect(formatCnpj(468_434_850, { pad: true })).toBe("00.000.468/4348-50");
		expect(formatCnpj(4_684_348_500, { pad: true })).toBe("00.004.684/3485-00");
		expect(formatCnpj(46_843_485_000, { pad: true })).toBe("00.046.843/4850-00");
		expect(formatCnpj(468_434_850_001, { pad: true })).toBe("00.468.434/8500-01");
		expect(formatCnpj(4_684_348_500_018, { pad: true })).toBe("04.684.348/5000-18");
		expect(formatCnpj(46_843_485_000_186, { pad: true })).toBe("46.843.485/0001-86");
	});

	it(`should NOT add digits after the CNPJ length (${CNPJ_LENGTH})`, () => {
		expect(formatCnpj("468434850001860000000000")).toBe("46.843.485/0001-86");
	});

	it("should remove all non numeric characters", () => {
		expect(formatCnpj("46.?ABC843.485/0001-86abc")).toBe("46.843.485/0001-86");
	});

	it("should format cnpj alphanumeric with mask for version 2", () => {
		expect(formatCnpj("", { version: 2 })).toBe("");
		expect(formatCnpj("Q", { version: 2 })).toBe("Q");
		expect(formatCnpj("Q0", { version: 2 })).toBe("Q0");
		expect(formatCnpj("Q0S", { version: 2 })).toBe("Q0.S");
		expect(formatCnpj("Q0SL", { version: 2 })).toBe("Q0.SL");
		expect(formatCnpj("Q0SLF", { version: 2 })).toBe("Q0.SLF");
		expect(formatCnpj("Q0SLFM", { version: 2 })).toBe("Q0.SLF.M");
		expect(formatCnpj("Q0SLFMB", { version: 2 })).toBe("Q0.SLF.MB");
		expect(formatCnpj("Q0SLFMBD", { version: 2 })).toBe("Q0.SLF.MBD");
		expect(formatCnpj("Q0SLFMBD7", { version: 2 })).toBe("Q0.SLF.MBD/7");
		expect(formatCnpj("Q0SLFMBD7V", { version: 2 })).toBe("Q0.SLF.MBD/7V");
		expect(formatCnpj("Q0SLFMBD7VX", { version: 2 })).toBe("Q0.SLF.MBD/7VX");
		expect(formatCnpj("Q0SLFMBD7VX4", { version: 2 })).toBe("Q0.SLF.MBD/7VX4");
		expect(formatCnpj("Q0SLFMBD7VX43", { version: 2 })).toBe("Q0.SLF.MBD/7VX4-3");
		expect(formatCnpj("q0SLFMBD7VX439", { version: 2 })).toBe("Q0.SLF.MBD/7VX4-39");
	});

	it("should remove non-alphanumeric characters for version 2", () => {
		expect(formatCnpj("46.?ABC843.485/0001-86abc", { version: 2 })).toBe("46.ABC.843/4850-00");
	});

	it("should allow all alphabet letters for version 2 (including E, O, T, U)", () => {
		expect(formatCnpj("12ABC34501DE35", { version: 2 })).toBe("12.ABC.345/01DE-35");
		expect(formatCnpj("12.ABC.345/01DE-35", { version: 2 })).toBe("12.ABC.345/01DE-35");
		expect(formatCnpj("12OUT345000199", { version: 2 })).toBe("12.OUT.345/0001-99");
	});

	it("should hide the first 2 digits and the 2 check digits when obfuscate is true", () => {
		expect(formatCnpj("46843485000186", { obfuscate: true })).toBe("**.843.485/0001-**");
		expect(formatCnpj(46_843_485_000_186, { obfuscate: true })).toBe("**.843.485/0001-**");
	});

	it("should pad before obfuscating", () => {
		expect(formatCnpj("4", { pad: true, obfuscate: true })).toBe("**.000.000/0000-**");
	});

	it("should apply the same positions to the alphanumeric CNPJ (version 2)", () => {
		expect(formatCnpj("q0SLFMBD7VX439", { version: 2, obfuscate: true })).toBe(
			"**.SLF.MBD/7VX4-**",
		);
	});

	it("should behave exactly as without the option when obfuscate is false or absent", () => {
		expect(formatCnpj("46843485000186", { obfuscate: false })).toBe("46.843.485/0001-86");
		expect(formatCnpj("46843485000186")).toBe("46.843.485/0001-86");
		expect(formatCnpj("q0SLFMBD7VX439", { version: 2, obfuscate: false })).toBe(
			"Q0.SLF.MBD/7VX4-39",
		);
	});

	describe("properties", () => {
		const upToACnpj = digitsUpTo(14);
		const fullCnpj = digits(14);
		const alphanumericCnpj = fc.stringMatching(/^[0-9A-Z]{14}$/);

		test("should only add the mask, never change the digits", () => {
			expectRoundTrip(formatCnpj, parseCnpj, upToACnpj);
		});

		test("should produce the documented mask shape for a full CNPJ", () => {
			fc.assert(
				fc.property(fullCnpj, (value) => {
					const obfuscated = formatCnpj(value, { obfuscate: true });

					expect(formatCnpj(value)).toMatch(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/);
					expect(obfuscated).toMatch(/^\*{2}\.\d{3}\.\d{3}\/\d{4}-\*{2}$/);
				}),
			);
		});

		test("should uppercase and keep every character of an alphanumeric CNPJ", () => {
			fc.assert(
				fc.property(alphanumericCnpj, (value) => {
					const formatted = formatCnpj(value.toLowerCase(), { version: 2 });
					const shape = /^[\dA-Z]{2}\.[\dA-Z]{3}\.[\dA-Z]{3}\/[\dA-Z]{4}-[\dA-Z]{2}$/;

					expect(formatted).toMatch(shape);
					expect(parseCnpj(formatted, { version: 2 })).toBe(value);
				}),
			);
		});

		test("should left pad a shorter value up to the CNPJ length", () => {
			expectPadsToLength(formatCnpj, parseCnpj, upToACnpj, CNPJ_LENGTH);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(formatCnpj, "string", anyValue);
		});
	});
});

describe("formatCnpj types", () => {
	test("should take a string or number value and options and return a string", () => {
		expectTypeOf(formatCnpj).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatCnpj).parameter(1).toEqualTypeOf<FormatCnpjOptions | undefined>();
		expectTypeOf(formatCnpj).returns.toEqualTypeOf<string>();
	});

	test("should type the pad, version and obfuscate options", () => {
		expectTypeOf<FormatCnpjOptions["pad"]>().toEqualTypeOf<boolean | undefined>();
		expectTypeOf<FormatCnpjOptions["version"]>().toEqualTypeOf<1 | 2 | undefined>();
		expectTypeOf<FormatCnpjOptions["obfuscate"]>().toEqualTypeOf<boolean | undefined>();
	});
});
