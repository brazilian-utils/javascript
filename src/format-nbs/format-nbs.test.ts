import { anyGarbage, anyValue, digits } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
	expectNeverThrows,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatNbs } from "./format-nbs";

describe("formatNbs", () => {
	it("should format an NBS code given as digits", () => {
		expect(formatNbs("101011100")).toBe("1.0101.11.00");
	});

	it("should format an NBS code given as a number", () => {
		expect(formatNbs(126_050_000)).toBe("1.2605.00.00");
	});

	it("should keep a code that already has the mask", () => {
		expect(formatNbs("1.0101.11.00")).toBe("1.0101.11.00");
	});

	it("should not validate whether the code exists in the official table", () => {
		expect(formatNbs("999999999")).toBe("9.9999.99.99");
	});

	it("should mask a partial value progressively", () => {
		expect(formatNbs("1")).toBe("1");
		expect(formatNbs("10")).toBe("1.0");
		expect(formatNbs("10101")).toBe("1.0101");
		expect(formatNbs("101011")).toBe("1.0101.1");
		expect(formatNbs("1010111")).toBe("1.0101.11");
		expect(formatNbs("10101110")).toBe("1.0101.11.0");
	});

	it("should drop the characters outside the mask and the digits after the ninth", () => {
		expect(formatNbs("abc101011100")).toBe("1.0101.11.00");
		expect(formatNbs("1010111009")).toBe("1.0101.11.00");
	});

	it("should return an empty string when there is no digit", () => {
		expect(formatNbs("")).toBe("");
		expect(formatNbs("abc")).toBe("");
	});

	it("should return an empty string for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(formatNbs(null)).toBe("");
		// @ts-expect-error not a string or number
		expect(formatNbs()).toBe("");
	});

	describe("properties", () => {
		const nineDigits = digits(9);

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(formatNbs, anyGarbage);
		});

		test("should always return a string", () => {
			expectAlwaysReturnsType(formatNbs, "string", anyValue);
		});

		test("should format every 9 digit value in the N.NNNN.NN.NN pattern", () => {
			expectMatchesPattern(formatNbs, /^\d\.\d{4}\.\d{2}\.\d{2}$/, nineDigits);
		});

		test("should be idempotent on a full 9 digit code", () => {
			expectIdempotent(formatNbs, nineDigits);
		});
	});
});

describe("formatNbs types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(formatNbs).parameters.toEqualTypeOf<[value: string | number]>();
		expectTypeOf(formatNbs).returns.toEqualTypeOf<string>();
	});
});
