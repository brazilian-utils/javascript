import { anyText, anyValue, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatNbs } from "../format-nbs/format-nbs";
import { parseNbs } from "./parse-nbs";

describe("parseNbs", () => {
	it("should remove NBS mask characters", () => {
		expect(parseNbs("1.0101.11.00")).toBe("101011100");
	});

	it("should remove non numeric characters", () => {
		expect(parseNbs("1?ABC.0101-11/00abc")).toBe("101011100");
	});

	it("should ignore digits after the NBS length", () => {
		expect(parseNbs("1.0101.11.00999")).toBe("101011100");
	});

	it("should read a number as the string of its digits", () => {
		expect(parseNbs(126_050_000)).toBe("126050000");
	});

	it("should keep a partial code as written, without padding it", () => {
		expect(parseNbs("1.01")).toBe("101");
		expect(parseNbs("1")).toBe("1");
	});

	it("should return an empty string when there is no digit", () => {
		expect(parseNbs("")).toBe("");
		expect(parseNbs("abc")).toBe("");
	});

	it("should return an empty string for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(parseNbs(null)).toBe("");
		// @ts-expect-error not a string or number
		expect(parseNbs()).toBe("");
	});

	describe("properties", () => {
		test("should return at most the digits of an NBS code", () => {
			expectMatchesPattern(parseNbs, /^\d{0,9}$/, anyText);
		});

		test("should undo formatNbs", () => {
			expectRoundTrip(formatNbs, parseNbs, digitsUpTo(9));
		});

		test("should be idempotent", () => {
			expectIdempotent(parseNbs, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseNbs, "string", anyValue);
		});
	});

	test("when it is a negative, fractional or unsafe number", () => {
		expect(parseNbs(-101_011_100)).toBe("");
		expect(parseNbs(-1)).toBe("");
		expect(parseNbs(1.5)).toBe("");
		expect(parseNbs(2 ** 53)).toBe("");
		expect(parseNbs(Number.MAX_VALUE)).toBe("");
		expect(parseNbs(1e21)).toBe("");
		expect(parseNbs(Number.NaN)).toBe("");
		expect(parseNbs(Number.POSITIVE_INFINITY)).toBe("");
		expect(parseNbs(Number.NEGATIVE_INFINITY)).toBe("");
	});
});

describe("parseNbs types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseNbs).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseNbs).returns.toEqualTypeOf<string>();
	});
});
