import { anyGarbage, anyValue, PROTOTYPE_KEYS } from "../_internals/test/arbitraries";
import { expectAlwaysReturnsType, expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isValidNbs } from "./is-valid-nbs";

describe("isValidNbs", () => {
	it("should validate an NBS code without a mask", () => {
		expect(isValidNbs("101011100")).toBe(true);
	});

	it("should validate an NBS code with the N.NNNN.NN.NN mask", () => {
		expect(isValidNbs("1.0101.11.00")).toBe(true);
		expect(isValidNbs("1.2606.00.00")).toBe(true);
	});

	it("should validate an NBS code given as a number", () => {
		expect(isValidNbs(101_011_100)).toBe(true);
	});

	it("should reject the headings of the nomenclature", () => {
		expect(isValidNbs("1.01")).toBe(false);
		expect(isValidNbs("1.0101")).toBe(false);
		expect(isValidNbs("1.0101.1")).toBe(false);
	});

	it("should reject a well formed code the table does not carry", () => {
		expect(isValidNbs("1.9999.99.99")).toBe(false);
		expect(isValidNbs("1.0101.11.01")).toBe(false);
	});

	it("should reject a malformed value", () => {
		expect(isValidNbs("1.0101abc11.00")).toBe(false);
		expect(isValidNbs("1..0101.11.00")).toBe(false);
		expect(isValidNbs("")).toBe(false);
	});

	it("should reject null, undefined and non lookup values", () => {
		// @ts-expect-error not a string or number
		expect(isValidNbs(null)).toBe(false);
		// @ts-expect-error not a string or number
		expect(isValidNbs()).toBe(false);
		// @ts-expect-error not a string or number
		expect(isValidNbs(["101011100"])).toBe(false);
		expect(isValidNbs(-101_011_100)).toBe(false);
	});

	it("should reject the keys of Object.prototype", () => {
		for (const key of PROTOTYPE_KEYS) expect(isValidNbs(key)).toBe(false);
	});

	it("should ignore surrounding whitespace", () => {
		expect(isValidNbs("  1.0101.11.00\n")).toBe(true);
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows(isValidNbs, anyGarbage);
		});

		test("should always return a boolean", () => {
			expectAlwaysReturnsType(isValidNbs, "boolean", anyValue);
		});
	});
});

describe("isValidNbs types", () => {
	test("should take a string or number and return a boolean", () => {
		expectTypeOf(isValidNbs).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(isValidNbs).returns.toEqualTypeOf<boolean>();
	});
});
