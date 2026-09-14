import { anyText, anyValue, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatNcm } from "../format-ncm/format-ncm";
import { parseNcm } from "./parse-ncm";

describe("parseNcm", () => {
	it("should remove NCM mask characters", () => {
		expect(parseNcm("8471.30.12")).toBe("84713012");
	});

	it("should remove non numeric characters", () => {
		expect(parseNcm("84?ABC71.30.12abc")).toBe("84713012");
	});

	it("should ignore digits after the NCM length", () => {
		expect(parseNcm("84713012999")).toBe("84713012");
	});

	it("should read a number as the string of its digits", () => {
		expect(parseNcm(84_713_012)).toBe("84713012");
	});

	it("should keep a partial code as written, without padding it", () => {
		expect(parseNcm("8471")).toBe("8471");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseNcm(null)).toBe("");
	});

	describe("properties", () => {
		test("should return at most the digits of an NCM code", () => {
			expectMatchesPattern(parseNcm, /^\d{0,8}$/, anyText);
		});

		test("should undo formatNcm", () => {
			expectRoundTrip(formatNcm, parseNcm, digitsUpTo(8));
		});

		test("should be idempotent", () => {
			expectIdempotent(parseNcm, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseNcm, "string", anyValue);
		});
	});
});

describe("parseNcm types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseNcm).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseNcm).returns.toEqualTypeOf<string>();
	});
});
