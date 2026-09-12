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

	it("should keep up to 13 digits for São Paulo (01) voter ids", () => {
		expect(parseVoterId("1234 5678 8 01 91")).toBe("1234567880191");
	});

	it("should keep up to 13 digits for Minas Gerais (02) voter ids", () => {
		expect(parseVoterId("1234567880299")).toBe("1234567880299");
	});

	it("should ignore digits after the 13-digit voter id length for SP/MG", () => {
		expect(parseVoterId("123456788019199")).toBe("1234567880191");
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
		test("should return at most the digits of the longest voter id", () => {
			expectMatchesPattern(parseVoterId, /^\d{0,13}$/, anyText);
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
});

describe("parseVoterId types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseVoterId).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseVoterId).returns.toEqualTypeOf<string>();
	});
});
