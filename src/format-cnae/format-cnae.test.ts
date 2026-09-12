import { anyGarbage, digits } from "../_internals/test/arbitraries";
import {
	expectIdempotent,
	expectMatchesPattern,
	expectNeverThrows,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatCnae } from "./format-cnae";

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

	it("should left pad a short code with zeros up to the full CNAE length", () => {
		expect(formatCnae("1")).toBe("0000-0/01");
		expect(formatCnae("501")).toBe("0000-5/01");
	});

	it("should return an empty string for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(formatCnae(null)).toBe("");
		// @ts-expect-error not a string or number
		expect(formatCnae()).toBe("");
	});

	describe("properties", () => {
		const sevenDigitArbitrary = digits(7);

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(formatCnae, anyGarbage);
		});

		test("should format every 7 digit value in the NNNN-N/NN pattern", () => {
			expectMatchesPattern(formatCnae, /^\d{4}-\d\/\d{2}$/, sevenDigitArbitrary);
		});

		test("should be idempotent on a full 7 digit code", () => {
			expectIdempotent(formatCnae, sevenDigitArbitrary);
		});
	});
});

describe("formatCnae types", () => {
	test("should take a string or number and return a string", () => {
		expectTypeOf(formatCnae).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatCnae).returns.toEqualTypeOf<string>();
	});
});
