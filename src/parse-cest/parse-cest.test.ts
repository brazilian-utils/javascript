import { anyText, anyValue, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatCest } from "../format-cest/format-cest";
import { parseCest } from "./parse-cest";

describe("parseCest", () => {
	it("should remove the CEST mask characters", () => {
		expect(parseCest("01.001.00")).toBe("0100100");
	});

	it("should remove every character that is not a digit", () => {
		expect(parseCest("CEST 28-999/00 ")).toBe("2899900");
	});

	it("should ignore the digits after the CEST length", () => {
		expect(parseCest("01001009876")).toBe("0100100");
	});

	it("should read a number as the string of its digits, without padding it", () => {
		expect(parseCest(2_899_900)).toBe("2899900");
		expect(parseCest(100_100)).toBe("100100");
	});

	it("should keep a partial code as written", () => {
		expect(parseCest("28.999")).toBe("28999");
		expect(parseCest("")).toBe("");
	});

	it("should return an empty string for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(parseCest(null)).toBe("");
		// @ts-expect-error not a string or number
		expect(parseCest()).toBe("");
	});

	describe("properties", () => {
		test("should return at most the digits of a CEST", () => {
			expectMatchesPattern(parseCest, /^\d{0,7}$/, anyText);
		});

		test("should undo formatCest", () => {
			expectRoundTrip(formatCest, parseCest, digitsUpTo(7));
		});

		test("should be idempotent", () => {
			expectIdempotent(parseCest, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseCest, "string", anyValue);
		});
	});
});

describe("parseCest types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseCest).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseCest).returns.toEqualTypeOf<string>();
	});
});
