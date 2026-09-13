import { anyGarbage, digits, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectIdempotent,
	expectMatchesPattern,
	expectNeverThrows,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatCnae, type FormatCnaeOptions } from "./format-cnae";

describe("formatCnae", () => {
	it("should format a CNAE code given as digits", () => {
		expect(formatCnae("6201501")).toBe("6201-5/01");
	});

	it("should format a CNAE code given as a number", () => {
		expect(formatCnae(6_201_501)).toBe("6201-5/01");
	});

	it("should format a CNAE code that already has the mask", () => {
		expect(formatCnae("6201-5/01")).toBe("6201-5/01");
	});

	it("should not validate whether the code exists in the official table", () => {
		expect(formatCnae("0000000")).toBe("0000-0/00");
	});

	it("should return an empty string for an empty value", () => {
		expect(formatCnae("")).toBe("");
	});

	it("should mask a partial value progressively by default", () => {
		expect(formatCnae("6")).toBe("6");
		expect(formatCnae("62")).toBe("62");
		expect(formatCnae("620")).toBe("620");
		expect(formatCnae("6201")).toBe("6201");
		expect(formatCnae("62015")).toBe("6201-5");
		expect(formatCnae("620150")).toBe("6201-5/0");
		expect(formatCnae("6201501")).toBe("6201-5/01");
	});

	it("should mask a partial number progressively by default", () => {
		expect(formatCnae(62)).toBe("62");
		expect(formatCnae(111_301)).toBe("1113-0/1");
	});

	it("should not add digits after the CNAE length", () => {
		expect(formatCnae("62015010000")).toBe("6201-5/01");
	});

	describe("pad option", () => {
		it("should left pad a short code with zeros up to the full CNAE length", () => {
			expect(formatCnae("", { pad: true })).toBe("0000-0/00");
			expect(formatCnae("1", { pad: true })).toBe("0000-0/01");
			expect(formatCnae("62", { pad: true })).toBe("0000-0/62");
			expect(formatCnae("501", { pad: true })).toBe("0000-5/01");
			expect(formatCnae("62015", { pad: true })).toBe("0062-0/15");
			expect(formatCnae("6201501", { pad: true })).toBe("6201-5/01");
		});

		it("should left pad a number the same way as its digits", () => {
			expect(formatCnae(62, { pad: true })).toBe("0000-0/62");
			expect(formatCnae(111_301, { pad: true })).toBe("0111-3/01");
		});

		it("should mask progressively for an explicit false", () => {
			expect(formatCnae("62", { pad: false })).toBe("62");
		});
	});

	it("should return an empty string for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(formatCnae(null)).toBe("");
		// @ts-expect-error not a string or number
		expect(formatCnae()).toBe("");
	});

	it("should return an empty string for a value that is not digits and mask characters", () => {
		expect(formatCnae("abc6201501")).toBe("");
	});

	it("should return an empty string for a number that is not a non-negative safe integer", () => {
		expect(formatCnae(-6_201_501)).toBe("");
		expect(formatCnae(620_150.1)).toBe("");
		expect(formatCnae(2 ** 53)).toBe("");
	});

	it("should return an empty string for a null-prototype object", () => {
		expect(formatCnae(Object.create(null))).toBe("");
	});

	describe("properties", () => {
		const sevenDigitArbitrary = digits(7);

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(formatCnae, anyGarbage);
		});

		test("should format every 7 digit value in the NNNN-N/NN pattern", () => {
			expectMatchesPattern(formatCnae, /^\d{4}-\d\/\d{2}$/, sevenDigitArbitrary);
		});

		test("should format every shorter value in the NNNN-N/NN pattern when padding", () => {
			expectMatchesPattern(
				(value) => formatCnae(value, { pad: true }),
				/^\d{4}-\d\/\d{2}$/,
				digitsUpTo(7),
			);
		});

		test("should be idempotent on a full 7 digit code", () => {
			expectIdempotent(formatCnae, sevenDigitArbitrary);
		});
	});
});

describe("formatCnae types", () => {
	test("should take a string or number value and options and return a string", () => {
		expectTypeOf(formatCnae).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatCnae).parameter(1).toEqualTypeOf<FormatCnaeOptions | undefined>();
		expectTypeOf(formatCnae).returns.toEqualTypeOf<string>();
	});

	test("should type the pad option as an optional boolean", () => {
		expectTypeOf<FormatCnaeOptions["pad"]>().toEqualTypeOf<boolean | undefined>();
	});
});
