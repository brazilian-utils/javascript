import { anyGarbage, digits, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectIdempotent,
	expectMatchesPattern,
	expectNeverThrows,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatNcm, type FormatNcmOptions } from "./format-ncm";

describe("formatNcm", () => {
	it("should format an NCM code given as digits", () => {
		expect(formatNcm("84713012")).toBe("8471.30.12");
	});

	it("should format an NCM code given as a number", () => {
		expect(formatNcm(84_713_012)).toBe("8471.30.12");
	});

	it("should format an NCM code that already has the mask", () => {
		expect(formatNcm("8471.30.12")).toBe("8471.30.12");
	});

	it("should mask a partial value progressively by default", () => {
		expect(formatNcm("8")).toBe("8");
		expect(formatNcm("84")).toBe("84");
		expect(formatNcm("847")).toBe("847");
		expect(formatNcm("8471")).toBe("8471");
		expect(formatNcm("84713")).toBe("8471.3");
		expect(formatNcm("847130")).toBe("8471.30");
		expect(formatNcm("8471301")).toBe("8471.30.1");
	});

	it("should mask a partial number progressively by default", () => {
		expect(formatNcm(8471)).toBe("8471");
		expect(formatNcm(847_130)).toBe("8471.30");
	});

	it("should not validate whether the code exists in the official table", () => {
		expect(formatNcm("00000000")).toBe("0000.00.00");
	});

	it("should return an empty string for an empty value", () => {
		expect(formatNcm("")).toBe("");
	});

	it("should not add digits after the NCM length", () => {
		expect(formatNcm("847130120000")).toBe("8471.30.12");
	});

	describe("pad option", () => {
		it("should left pad a short code with zeros up to the full NCM length", () => {
			expect(formatNcm("", { pad: true })).toBe("0000.00.00");
			expect(formatNcm("1", { pad: true })).toBe("0000.00.01");
			expect(formatNcm("8471", { pad: true })).toBe("0000.84.71");
			expect(formatNcm("847130", { pad: true })).toBe("0084.71.30");
			expect(formatNcm("84713012", { pad: true })).toBe("8471.30.12");
		});

		it("should left pad a number the same way as its digits", () => {
			expect(formatNcm(8471, { pad: true })).toBe("0000.84.71");
			expect(formatNcm(84_713_012, { pad: true })).toBe("8471.30.12");
		});

		it("should mask progressively for an explicit false", () => {
			expect(formatNcm("8471", { pad: false })).toBe("8471");
		});
	});

	it("should return an empty string for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(formatNcm(null)).toBe("");
		// @ts-expect-error not a string or number
		expect(formatNcm()).toBe("");
	});

	it("should return an empty string for null and undefined even under pad, instead of a zero-filled code", () => {
		// @ts-expect-error not a string or number
		expect(formatNcm(null, { pad: true })).toBe("");
		// @ts-expect-error not a string or number
		expect(formatNcm(undefined, { pad: true })).toBe("");
	});

	it("should read only the digits of a value with other characters, like formatCpf", () => {
		expect(formatNcm("abc8471")).toBe("8471");
		expect(formatNcm("8471.30-12")).toBe("8471.30.12");
	});

	it("should read a signed or fractional number as the string of its digits, like formatCpf", () => {
		expect(formatNcm(-84_713_012)).toBe("8471.30.12");
		expect(formatNcm(8_471_301.2)).toBe("8471.30.12");
		expect(formatNcm(2 ** 53)).toBe("9007.19.92");
	});

	it("should return an empty string for a null-prototype object", () => {
		expect(formatNcm(Object.create(null))).toBe("");
	});

	describe("properties", () => {
		const eightDigitArbitrary = digits(8);

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(formatNcm, anyGarbage);
		});

		test("should format every 8 digit value in the NNNN.NN.NN pattern", () => {
			expectMatchesPattern(formatNcm, /^\d{4}\.\d{2}\.\d{2}$/, eightDigitArbitrary);
		});

		test("should format every shorter value in the NNNN.NN.NN pattern when padding", () => {
			expectMatchesPattern(
				(value) => formatNcm(value, { pad: true }),
				/^\d{4}\.\d{2}\.\d{2}$/,
				digitsUpTo(8),
			);
		});

		test("should be idempotent on a full 8 digit code", () => {
			expectIdempotent(formatNcm, eightDigitArbitrary);
		});
	});
});

describe("formatNcm types", () => {
	test("should take a string or number value and options and return a string", () => {
		expectTypeOf(formatNcm).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatNcm).parameter(1).toEqualTypeOf<FormatNcmOptions | undefined>();
		expectTypeOf(formatNcm).returns.toEqualTypeOf<string>();
	});

	test("should type the pad option as an optional boolean", () => {
		expectTypeOf<FormatNcmOptions["pad"]>().toEqualTypeOf<boolean | undefined>();
	});
});
