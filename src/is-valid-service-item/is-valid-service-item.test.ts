import { anyGarbage, anyValue, PROTOTYPE_KEYS } from "../_internals/test/arbitraries";
import { expectAlwaysReturnsType, expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isValidServiceItem } from "./is-valid-service-item";

describe("isValidServiceItem", () => {
	it("should validate a subitem in the form the law prints", () => {
		expect(isValidServiceItem("1.01")).toBe(true);
		expect(isValidServiceItem("17.25")).toBe(true);
		expect(isValidServiceItem("40.01")).toBe(true);
	});

	it("should validate a zero padded item and the bare digits", () => {
		expect(isValidServiceItem("01.01")).toBe(true);
		expect(isValidServiceItem("0101")).toBe(true);
		expect(isValidServiceItem(101)).toBe(true);
	});

	it("should reject the vetoed subitems", () => {
		expect(isValidServiceItem("3.01")).toBe(false);
		expect(isValidServiceItem("17.07")).toBe(false);
	});

	it("should reject item 99 of the national list and the 6 digit national codes", () => {
		expect(isValidServiceItem("99.01")).toBe(false);
		expect(isValidServiceItem("010101")).toBe(false);
	});

	it("should reject a malformed value", () => {
		expect(isValidServiceItem("1.1")).toBe(false);
		expect(isValidServiceItem("1-01")).toBe(false);
		expect(isValidServiceItem("")).toBe(false);
	});

	it("should reject null, undefined and non lookup values", () => {
		// @ts-expect-error not a string or number
		expect(isValidServiceItem(null)).toBe(false);
		// @ts-expect-error not a string or number
		expect(isValidServiceItem()).toBe(false);
		// @ts-expect-error not a string or number
		expect(isValidServiceItem(["1.01"])).toBe(false);
		expect(isValidServiceItem(1.01)).toBe(false);
	});

	it("should validate the bare digits of an item with one digit", () => {
		expect(isValidServiceItem("101")).toBe(true);
		expect(isValidServiceItem("1.01")).toBe(true);
	});

	it("should ignore surrounding whitespace", () => {
		expect(isValidServiceItem("  1.01\n")).toBe(true);
	});

	it("should reject the keys of Object.prototype", () => {
		for (const key of PROTOTYPE_KEYS) expect(isValidServiceItem(key)).toBe(false);
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows(isValidServiceItem, anyGarbage);
		});

		test("should always return a boolean", () => {
			expectAlwaysReturnsType(isValidServiceItem, "boolean", anyValue);
		});
	});
});

describe("isValidServiceItem types", () => {
	test("should take a string or number and return a boolean", () => {
		expectTypeOf(isValidServiceItem).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(isValidServiceItem).returns.toEqualTypeOf<boolean>();
	});
});
