import { anyGarbage, digits, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectIdempotent,
	expectMatchesPattern,
	expectNeverThrows,
	expectPadsToLength,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseCest } from "../parse-cest/parse-cest";
import { formatCest, type FormatCestOptions } from "./format-cest";

describe("formatCest", () => {
	it("should format a CEST given as digits", () => {
		expect(formatCest("0100100")).toBe("01.001.00");
	});

	it("should format a CEST given as a number", () => {
		expect(formatCest(2_899_900)).toBe("28.999.00");
	});

	it("should leave a CEST that already has the mask as it is", () => {
		expect(formatCest("17.024.05")).toBe("17.024.05");
	});

	it("should mask a partial value progressively by default", () => {
		expect(formatCest("0")).toBe("0");
		expect(formatCest("01")).toBe("01");
		expect(formatCest("010")).toBe("01.0");
		expect(formatCest("01001")).toBe("01.001");
		expect(formatCest("010010")).toBe("01.001.0");
	});

	it("should not pad a number by default, so a lost leading zero shifts the mask", () => {
		expect(formatCest(100_100)).toBe("10.010.0");
	});

	it("should not check the code against the annexes", () => {
		expect(formatCest("0000000")).toBe("00.000.00");
	});

	it("should not add digits after the CEST length", () => {
		expect(formatCest("01001009999")).toBe("01.001.00");
	});

	describe("pad option", () => {
		it("should left pad a short value with zeros up to the 7 digits", () => {
			expect(formatCest("", { pad: true })).toBe("00.000.00");
			expect(formatCest("1", { pad: true })).toBe("00.000.01");
			expect(formatCest("100100", { pad: true })).toBe("01.001.00");
			expect(formatCest("2899900", { pad: true })).toBe("28.999.00");
		});

		it("should left pad a number the same way as its digits", () => {
			expect(formatCest(100_100, { pad: true })).toBe("01.001.00");
		});

		it("should mask progressively for an explicit false", () => {
			expect(formatCest("01001", { pad: false })).toBe("01.001");
		});
	});

	it("should return an empty string for an empty, null or undefined value, even under pad", () => {
		expect(formatCest("")).toBe("");
		// @ts-expect-error not a string or number
		expect(formatCest(null)).toBe("");
		// @ts-expect-error not a string or number
		expect(formatCest()).toBe("");
		// @ts-expect-error not a string or number
		expect(formatCest(null, { pad: true })).toBe("");
	});

	it("should read only the digits of a value with other characters, like formatCpf", () => {
		expect(formatCest("abc0100100")).toBe("01.001.00");
		expect(formatCest("01-001/00")).toBe("01.001.00");
		expect(formatCest(-2_899_900)).toBe("28.999.00");
	});

	it("should return an empty string for a null-prototype object", () => {
		expect(formatCest(Object.create(null))).toBe("");
	});

	describe("properties", () => {
		const sevenDigitArbitrary = digits(7);

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(formatCest, anyGarbage);
		});

		test("should format every 7 digit value in the NN.NNN.NN pattern", () => {
			expectMatchesPattern(formatCest, /^\d{2}\.\d{3}\.\d{2}$/, sevenDigitArbitrary);
		});

		test("should left pad every shorter value to a complete code when padding", () => {
			expectPadsToLength(formatCest, parseCest, digitsUpTo(7), 7);
		});

		test("should be idempotent on a full 7 digit code", () => {
			expectIdempotent(formatCest, sevenDigitArbitrary);
		});
	});
});

describe("formatCest types", () => {
	test("should take a string or number value and options and return a string", () => {
		expectTypeOf(formatCest).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatCest).parameter(1).toEqualTypeOf<FormatCestOptions | undefined>();
		expectTypeOf(formatCest).returns.toEqualTypeOf<string>();
	});

	test("should type the pad option as an optional boolean", () => {
		expectTypeOf<FormatCestOptions["pad"]>().toEqualTypeOf<boolean | undefined>();
	});
});
