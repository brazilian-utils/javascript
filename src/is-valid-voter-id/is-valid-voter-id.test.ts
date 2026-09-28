import * as fc from "fast-check";

import {
	anyValue,
	digitsOfOtherLength,
	maskSeparators,
	voterIds,
} from "../_internals/test/arbitraries";
import { expectAlwaysReturnsType, expectRejected } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { generateVoterId } from "../generate-voter-id/generate-voter-id";
import { isValidVoterId } from "./is-valid-voter-id";

describe("isValidVoterId", () => {
	it("should validate voter ids", () => {
		const voterId = generateVoterId("SP");
		expect(isValidVoterId(voterId)).toBe(true);
		expect(isValidVoterId(`${voterId.slice(0, -1)}${voterId.endsWith("0") ? "1" : "0"}`)).toBe(
			false,
		);
	});

	it("should validate a real 12-digit voter id", () => {
		expect(isValidVoterId("102385010671")).toBe(true);
	});

	it("should reject a 13-digit value, since a voter id has at most 12 digits", () => {
		// The São Paulo/Minas Gerais 9-digit sequential form 2.4.0 accepted: the resolution caps the id at 12 digits.
		expect(isValidVoterId("1234567880191")).toBe(false);
		expect(isValidVoterId("1234 5678 8 01 91")).toBe(false);
		expect(isValidVoterId("0123456780191")).toBe(false);
		expect(isValidVoterId("123456780191")).toBe(true);
	});

	it("should accept a voter id issued without the leading zeros of its sequential number", () => {
		// 00012345: 1·5 + 2·6 + 3·7 + 4·8 + 5·9 = 115 ≡ 5; UF 01: 0·7 + 1·8 + 5·9 = 53 ≡ 9
		expect(isValidVoterId("000123450159")).toBe(true);
		expect(isValidVoterId("00123450159")).toBe(true);
		expect(isValidVoterId("123450159")).toBe(true);
		expect(isValidVoterId("1 2345 01 59")).toBe(true);
		expect(isValidVoterId("12345 01 59")).toBe(true);
		expect(isValidVoterId("123450158")).toBe(false);
	});

	it("should accept a sequential number of every length from 1 to 8 digits once its zeros are dropped", () => {
		// 00000012, UF 28: 1·8 + 2·9 = 26 ≡ 4; 2·7 + 8·8 + 4·9 = 114 ≡ 4
		expect(isValidVoterId("122844")).toBe(true);
		// 00001234, UF 06: 1·6 + 2·7 + 3·8 + 4·9 = 80 ≡ 3; 6·8 + 3·9 = 75 ≡ 9
		expect(isValidVoterId("12340639")).toBe(true);
		expect(isValidVoterId("1234 06 39")).toBe(true);
	});

	it("should accept the shortest form, a single sequential digit, and nothing shorter", () => {
		// 00000001: 1·9 = 9; UF 01: 0·7 + 1·8 + 9·9 = 89 ≡ 1
		expect(isValidVoterId("10191")).toBe(true);
		expect(isValidVoterId("000000010191")).toBe(true);
		// 00000000 (UF 01): remainder 0 → 1 for SP; 8 + 9 = 17 ≡ 6
		expect(isValidVoterId("000000000116")).toBe(true);
		expect(isValidVoterId("0116")).toBe(false);
	});

	it("should return false when the UF code is outside 01-28", () => {
		expect(isValidVoterId("123456789900")).toBe(false);
	});

	it("should reject a value with a letter attached to the digits", () => {
		expect(isValidVoterId("ab102385010671")).toBe(false);
		expect(isValidVoterId("102385010671ab")).toBe(false);
	});

	it("should reject a mask character outside whitespace, `.`, `-` and `/`", () => {
		expect(isValidVoterId("1023_8501_06_71")).toBe(false);
		expect(isValidVoterId("1023-8501-06-71")).toBe(true);
	});

	it("should accept the documented whitespace and dot masks", () => {
		expect(isValidVoterId("1023 8501 06 71")).toBe(true);
		expect(isValidVoterId("1023-8501/06-71")).toBe(true);
		expect(isValidVoterId("1023.8501.06.71")).toBe(true);
		expect(isValidVoterId("0001.2345.01.59")).toBe(true);
	});

	it("should only accept separators between the groups of a sequential number grouped from the right", () => {
		// 01234567: 1·3 + 2·4 + 3·5 + 4·6 + 5·7 + 6·8 + 7·9 = 196 ≡ 9; UF 01: 8 + 81 = 89 ≡ 1
		expect(isValidVoterId("123 4567 01 91")).toBe(true);
		expect(isValidVoterId("1234 567 01 91")).toBe(false);
		expect(isValidVoterId("1234 5678 0 1 91")).toBe(false);
	});

	it("should return false for null, undefined, a number or an empty string", () => {
		// @ts-expect-error: intentionally invalid input
		expect(isValidVoterId(null)).toBe(false);
		// @ts-expect-error: intentionally invalid input
		expect(isValidVoterId()).toBe(false);
		// @ts-expect-error: intentionally invalid input
		expect(isValidVoterId(123_456_780_124)).toBe(false);
		expect(isValidVoterId("")).toBe(false);
	});

	it("should reject a valid voter id passed as a number instead of a string", () => {
		// @ts-expect-error: intentionally invalid input
		expect(isValidVoterId(102_385_010_671)).toBe(false);
	});

	it("should reject a value longer than 12 digits, even when its checksum would otherwise match", () => {
		expect(isValidVoterId("1234567890370")).toBe(false);
		expect(isValidVoterId("0000000000191")).toBe(false);
	});

	it("should read a 9-digit value as the id without its leading zeros", () => {
		// 2.4.0 rejected it for its length; it is 000000010191 without the leading zeros
		expect(isValidVoterId("000010191")).toBe(true);
	});

	it("should reject the UF code boundaries 0 and 29, even when the checksum would otherwise match", () => {
		expect(isValidVoterId("000000000000")).toBe(false);
		expect(isValidVoterId("000000002909")).toBe(false);
	});

	it("should accept the UF code boundaries 1 and 28", () => {
		expect(isValidVoterId("000000010191")).toBe(true);
		expect(isValidVoterId("000000002801")).toBe(true);
	});

	describe("properties", () => {
		test("should accept a generated voter id whatever mask surrounds its digits", () => {
			fc.assert(
				fc.property(fc.gen(), maskSeparators([".", " "], 3, 3), (g, separators) => {
					const voterId = g(voterIds);
					const head = `${separators[0]}${voterId.slice(0, 8)}${separators[1]}`;

					expect(isValidVoterId(`${head}${voterId.slice(8)}${separators[2]}`)).toBe(true);
				}),
			);
		});

		test("should reject any digits only value longer than 12 digits or shorter than 5", () => {
			expectRejected(isValidVoterId, digitsOfOtherLength(26, [5, 6, 7, 8, 9, 10, 11, 12]));
		});

		test("should accept a generated voter id with any number of its leading zeros dropped", () => {
			fc.assert(
				fc.property(voterIds(), fc.nat(8), (voterId, dropped) => {
					const zeros = /^0*/.exec(voterId)?.[0].length ?? 0;
					const shortened = voterId.slice(Math.min(dropped, zeros, 7));

					expect(isValidVoterId(shortened)).toBe(true);
				}),
			);
		});

		test("should never throw and always return a boolean", () => {
			expectAlwaysReturnsType(isValidVoterId, "boolean", anyValue);
		});
	});
});

describe("isValidVoterId types", () => {
	test("should take a string and return a boolean", () => {
		expectTypeOf(isValidVoterId).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(isValidVoterId).returns.toEqualTypeOf<boolean>();
	});
});
