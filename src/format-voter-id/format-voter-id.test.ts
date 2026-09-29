import * as fc from "fast-check";

import { anyValue, digits, digitsUpTo } from "../_internals/test/arbitraries";
import { expectAlwaysReturnsType } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { type FormatVoterIdOptions, formatVoterId } from "./format-voter-id";

describe("formatVoterId", () => {
	it("should format voter ids", () => {
		expect(formatVoterId("")).toBe("");
		expect(formatVoterId("1")).toBe("1");
		expect(formatVoterId("12")).toBe("12");
		expect(formatVoterId("123")).toBe("123");
		expect(formatVoterId("1234")).toBe("1234");
		expect(formatVoterId("12345")).toBe("1234 5");
		expect(formatVoterId("123456")).toBe("1234 56");
		expect(formatVoterId("1234567")).toBe("1234 567");
		expect(formatVoterId("12345678")).toBe("1234 5678");
		expect(formatVoterId("123456780")).toBe("1234 5678 0");
		expect(formatVoterId("1234567801")).toBe("1234 5678 01");
		expect(formatVoterId("12345678012")).toBe("1234 5678 01 2");
		expect(formatVoterId("123456780124")).toBe("1234 5678 01 24");
	});

	it("should use the 12-digit grouping for every value, São Paulo (01) and Minas Gerais (02) included", () => {
		// 2.4.0 grouped these as "1234 5678 8 01 91" / "1234 5678 8 02 99": a voter id has at most 12 digits
		expect(formatVoterId("1234567880191")).toBe("1234 5678 80 19");
		expect(formatVoterId("1234567880299")).toBe("1234 5678 80 29");
	});

	it("should drop the digits past the 12th", () => {
		expect(formatVoterId("12345678801912")).toBe("1234 5678 80 19");
		expect(formatVoterId("12345678803991")).toBe("1234 5678 80 39");
	});

	it("should restore the leading zeros of a voter id issued without them when pad is true", () => {
		expect(formatVoterId("123450159", { pad: true })).toBe("0001 2345 01 59");
		expect(formatVoterId(123_450_159, { pad: true })).toBe("0001 2345 01 59");
		expect(formatVoterId("10191", { pad: true })).toBe("0000 0001 01 91");
		expect(formatVoterId("123456780124", { pad: true })).toBe("1234 5678 01 24");
		expect(formatVoterId("123450159", { pad: true, obfuscate: true })).toBe("***1 2345 01 **");
		expect(formatVoterId("123450159", { pad: false })).toBe("1234 5015 9");
		expect(formatVoterId("123450159")).toBe("1234 5015 9");
	});

	it("should hide the first 3 digits and the 2 check digits when obfuscate is truthy", () => {
		expect(formatVoterId("123456780124", { obfuscate: true })).toBe("***4 5678 01 **");
		expect(formatVoterId(123_456_780_124, { obfuscate: true })).toBe("***4 5678 01 **");
		expect(formatVoterId("1234567880191", { obfuscate: true })).toBe("***4 5678 80 **");
		expect(formatVoterId("1234567880399", { obfuscate: true })).toBe("***4 5678 80 **");
		expect(formatVoterId("12345", { obfuscate: true })).toBe("***4 5");
		// @ts-expect-error: intentionally not a boolean
		expect(formatVoterId("123456780124", { obfuscate: 1 })).toBe("***4 5678 01 **");
	});

	it("should behave exactly as without the option when obfuscate is falsy", () => {
		expect(formatVoterId("123456780124", { obfuscate: false })).toBe("1234 5678 01 24");
		expect(formatVoterId("123456780124", {})).toBe("1234 5678 01 24");
		// @ts-expect-error: intentionally not a boolean
		expect(formatVoterId("123456780124", { obfuscate: 0 })).toBe("1234 5678 01 24");
	});

	it("should return an empty string for null or undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatVoterId(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatVoterId()).toBe("");
	});

	describe("properties", () => {
		const upToAVoterId = digitsUpTo(12);

		test("should only add spaces, never change the digits", () => {
			fc.assert(
				fc.property(upToAVoterId, (value) => {
					expect(formatVoterId(value).replaceAll(" ", "")).toBe(value);
				}),
			);
		});

		test("should use the documented grouping for 12 digits", () => {
			fc.assert(
				fc.property(digits(12), (value) => {
					expect(formatVoterId(value)).toMatch(/^\d{4} \d{4} \d{2} \d{2}$/);
					expect(formatVoterId(value, { obfuscate: true })).toMatch(/^\*{3}\d \d{4} \d{2} \*{2}$/);
				}),
			);
		});

		test("should pad any shorter value to the 12-digit grouping, keeping its digits last", () => {
			fc.assert(
				fc.property(digitsUpTo(12), (value) => {
					const formatted = formatVoterId(value, { pad: true });

					expect(formatted).toMatch(/^\d{4} \d{4} \d{2} \d{2}$/);
					expect(formatted.replaceAll(" ", "")).toBe(value.padStart(12, "0"));
				}),
			);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(formatVoterId, "string", anyValue);
		});
	});

	test("when it is a negative, fractional or unsafe number", () => {
		expect(formatVoterId(-123_456_780_124)).toBe("");
		expect(formatVoterId(-1)).toBe("");
		expect(formatVoterId(1.5)).toBe("");
		expect(formatVoterId(2 ** 53)).toBe("");
		expect(formatVoterId(Number.MAX_VALUE)).toBe("");
		expect(formatVoterId(1e21)).toBe("");
		expect(formatVoterId(Number.NaN)).toBe("");
		expect(formatVoterId(Number.POSITIVE_INFINITY)).toBe("");
		expect(formatVoterId(Number.NEGATIVE_INFINITY)).toBe("");
	});
});

describe("formatVoterId types", () => {
	test("should take a string or number value and options and return a string", () => {
		expectTypeOf(formatVoterId).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatVoterId).parameter(1).toEqualTypeOf<FormatVoterIdOptions | undefined>();
		expectTypeOf(formatVoterId).returns.toEqualTypeOf<string>();
	});

	test("should type the obfuscate and pad options as optional booleans", () => {
		expectTypeOf<FormatVoterIdOptions["obfuscate"]>().toEqualTypeOf<boolean | undefined>();
		expectTypeOf<FormatVoterIdOptions["pad"]>().toEqualTypeOf<boolean | undefined>();
	});
});
