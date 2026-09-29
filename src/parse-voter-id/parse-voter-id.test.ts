import { anyText, anyValue, digits } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatVoterId } from "../format-voter-id/format-voter-id";
import { parseVoterId } from "./parse-voter-id";

describe("parseVoterId", () => {
	it("should remove voter id formatting", () => {
		expect(parseVoterId("1234 5678 01 24")).toBe("123456780124");
	});

	it("should ignore digits after the voter id length (non SP/MG)", () => {
		expect(parseVoterId("12345678032499")).toBe("123456780324");
	});

	it("should keep 12 digits at most, São Paulo (01) and Minas Gerais (02) included", () => {
		// 2.4.0 kept a 13th digit for UF 01/02: the resolution caps the id at 12 digits
		expect(parseVoterId("1234 5678 8 01 91")).toBe("123456788019");
		expect(parseVoterId("1234567880299")).toBe("123456788029");
		expect(parseVoterId("123456788019199")).toBe("123456788019");
	});

	it("should keep a voter id issued without its leading zeros as it is", () => {
		expect(parseVoterId("12345 01 59")).toBe("123450159");
		expect(parseVoterId("0001 2345 01 59")).toBe("000123450159");
	});

	it("should return an empty string for null or undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(parseVoterId(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(parseVoterId()).toBe("");
	});

	it("should ignore digits after the 12-digit length when the 9th/10th digits are not SP/MG, even with extra digits", () => {
		expect(parseVoterId("12345678905999")).toBe("123456789059");
	});

	describe("properties", () => {
		test("should return at most the 12 digits of a voter id", () => {
			expectMatchesPattern(parseVoterId, /^\d{0,12}$/, anyText);
		});

		test("should undo the formatting of a 12 digit voter id", () => {
			expectRoundTrip(formatVoterId, parseVoterId, digits(12));
		});

		test("should be idempotent", () => {
			expectIdempotent(parseVoterId, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseVoterId, "string", anyValue);
		});
	});

	test("when it is a negative, fractional or unsafe number", () => {
		expect(parseVoterId(-123_456_780_124)).toBe("");
		expect(parseVoterId(-1)).toBe("");
		expect(parseVoterId(1.5)).toBe("");
		expect(parseVoterId(2 ** 53)).toBe("");
		expect(parseVoterId(Number.MAX_VALUE)).toBe("");
		expect(parseVoterId(1e21)).toBe("");
		expect(parseVoterId(Number.NaN)).toBe("");
		expect(parseVoterId(Number.POSITIVE_INFINITY)).toBe("");
		expect(parseVoterId(Number.NEGATIVE_INFINITY)).toBe("");
	});
});

describe("parseVoterId types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseVoterId).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseVoterId).returns.toEqualTypeOf<string>();
	});
});
