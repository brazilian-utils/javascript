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

	it("should use the 13-digit grouping once the sequential number has 9 digits (São Paulo/Minas Gerais)", () => {
		expect(formatVoterId("1234567880191")).toBe("1234 5678 8 01 91");
		expect(formatVoterId("1234567880299")).toBe("1234 5678 8 02 99");
	});

	it("should drop the digits past the last slot of the pattern", () => {
		expect(formatVoterId("1234567880191")).toBe("1234 5678 8 01 91");
		expect(formatVoterId("12345678801912")).toBe("1234 5678 8 01 91");
		expect(formatVoterId("123456788019123")).toBe("1234 5678 8 01 91");
		expect(formatVoterId("12345678803991")).toBe("1234 5678 80 39");
	});

	it("should keep the 12-digit grouping for a 13-digit value whose UF cannot carry 9 sequential digits", () => {
		expect(formatVoterId("1234567880399")).toBe("1234 5678 80 39");
	});

	it("should keep using the 12-digit grouping for inputs with 12 digits or fewer", () => {
		expect(formatVoterId("123456788")).toBe("1234 5678 8");
		expect(formatVoterId("123456788019")).toBe("1234 5678 80 19");
	});

	it("should hide the first 3 digits and the 2 check digits when obfuscate is truthy", () => {
		expect(formatVoterId("123456780124", { obfuscate: true })).toBe("***4 5678 01 **");
		expect(formatVoterId(123_456_780_124, { obfuscate: true })).toBe("***4 5678 01 **");
		expect(formatVoterId("1234567880191", { obfuscate: true })).toBe("***4 5678 8 01 **");
		expect(formatVoterId("1234567880399", { obfuscate: true })).toBe("***4 5678 80 **");
		expect(formatVoterId("12345", { obfuscate: true })).toBe("***4 5");
		// @ts-expect-error: intentionally not a boolean
		expect(formatVoterId("123456780124", { obfuscate: 1 })).toBe("***4 5678 01 **");
	});

	it("should behave exactly as without the option when obfuscate is falsy", () => {
		expect(formatVoterId("123456780124", { obfuscate: false })).toBe("1234 5678 01 24");
		expect(formatVoterId("1234567880191", {})).toBe("1234 5678 8 01 91");
		// @ts-expect-error: intentionally not a boolean
		expect(formatVoterId("1234567880191", { obfuscate: 0 })).toBe("1234 5678 8 01 91");
	});

	it("should return an empty string for null or undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatVoterId(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatVoterId()).toBe("");
	});

	describe("properties", () => {
		const upToAVoterId = digitsUpTo(13);

		test("should only add spaces, never change the digits", () => {
			fc.assert(
				fc.property(upToAVoterId, (value) => {
					expect(formatVoterId(value).replaceAll(" ", "")).toBe(value);
				}),
			);
		});

		test("should use the grouping documented for each of the two lengths", () => {
			fc.assert(
				fc.property(digits(12), digits(9), fc.constantFrom("01", "02"), (short, sequential, uf) => {
					const extended = `${sequential}${uf}00`;

					expect(formatVoterId(short)).toMatch(/^\d{4} \d{4} \d{2} \d{2}$/);
					expect(formatVoterId(extended)).toMatch(/^\d{4} \d{4} \d \d{2} \d{2}$/);
					expect(formatVoterId(short, { obfuscate: true })).toMatch(/^\*{3}\d \d{4} \d{2} \*{2}$/);
					expect(formatVoterId(extended, { obfuscate: true })).toMatch(
						/^\*{3}\d \d{4} \d \d{2} \*{2}$/,
					);
				}),
			);
		});

		test("should keep the 12-digit grouping for 13 digits when the UF is not 01 or 02", () => {
			fc.assert(
				fc.property(digits(9), fc.constantFrom("03", "10", "28", "99"), (sequential, uf) => {
					expect(formatVoterId(`${sequential}${uf}00`)).toMatch(/^\d{4} \d{4} \d{2} \d{2}$/);
				}),
			);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(formatVoterId, "string", anyValue);
		});
	});
});

describe("formatVoterId types", () => {
	test("should take a string or number value and options and return a string", () => {
		expectTypeOf(formatVoterId).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatVoterId).parameter(1).toEqualTypeOf<FormatVoterIdOptions | undefined>();
		expectTypeOf(formatVoterId).returns.toEqualTypeOf<string>();
	});

	test("should type the obfuscate option as an optional boolean", () => {
		expectTypeOf<FormatVoterIdOptions["obfuscate"]>().toEqualTypeOf<boolean | undefined>();
	});
});
