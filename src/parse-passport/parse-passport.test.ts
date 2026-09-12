import { anyText, anyValue, asciiAlphanumericText } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectCaseInsensitive,
	expectIdempotent,
	expectMatchesPattern,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { parsePassport } from "./parse-passport";

describe("parsePassport", () => {
	describe("should return the string without symbols", () => {
		test("when there are no symbols, returns the same string", () => {
			expect(parsePassport("Ab123456")).toBe("AB123456");
		});

		test("when there are spaces", () => {
			expect(parsePassport(" AB 123 456 ")).toBe("AB123456");
		});

		test("when there are dashes", () => {
			expect(parsePassport("-AB1-23-4-56-")).toBe("AB123456");
		});

		test("when there are dots", () => {
			expect(parsePassport(".AB.1.23.456.")).toBe("AB123456");
		});

		test("when there are multiple symbols", () => {
			expect(parsePassport(".A B.1.2-3.45 -. 6.")).toBe("AB123456");
		});

		test("when there are extra characters after the passport length", () => {
			expect(parsePassport("AB123456789")).toBe("AB123456");
		});

		test("when it is a non-string value", () => {
			// @ts-expect-error not a string
			expect(parsePassport(null)).toBe("");
		});
	});

	describe("properties", () => {
		test("should always return at most 8 uppercase alphanumeric characters", () => {
			expectMatchesPattern(parsePassport, /^[0-9A-Z]{0,8}$/, anyText);
		});

		test("should be idempotent", () => {
			expectIdempotent(parsePassport, anyText);
		});

		test("should ignore the case of an ascii alphanumeric value", () => {
			expectCaseInsensitive(parsePassport, asciiAlphanumericText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parsePassport, "string", anyValue);
		});
	});
});

describe("parsePassport types", () => {
	test("should take a string and return a string", () => {
		expectTypeOf(parsePassport).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(parsePassport).returns.toEqualTypeOf<string>();
	});
});
