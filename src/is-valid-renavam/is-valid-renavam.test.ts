import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isValidRenavam } from "./is-valid-renavam";

const RENAVAM_DIGITS = Array.from({ length: 10 }, (_, digit) => String(digit));

describe("isValidRenavam", () => {
	describe("should return false", () => {
		test("when it is an empty string", () => {
			expect(isValidRenavam("")).toBe(false);
		});

		test("when a valid registration carries an extra digit", () => {
			// The 11 digits of a valid RENAVAM, plus a twelfth: neither the 9 nor the 11 digit form,
			// so it is turned down even though its first eleven digits check out.
			expect(isValidRenavam("00639884962")).toBe(true);
			expect(isValidRenavam("006398849620")).toBe(false);
			expect(isValidRenavam("0639884962")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidRenavam(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidRenavam()).toBe(false);
		});

		test("when it is a boolean", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidRenavam(true)).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidRenavam(false)).toBe(false);
		});

		test("when it is an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidRenavam({})).toBe(false);
		});

		test("when it is an array", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidRenavam([])).toBe(false);
		});

		test("when it has less than 9 digits", () => {
			expect(isValidRenavam("12345678")).toBe(false);
		});

		test("when it has more than 11 digits", () => {
			expect(isValidRenavam("123456789012")).toBe(false);
		});

		test("when it contains only letters or special characters", () => {
			expect(isValidRenavam("abcdefghij")).toBe(false);
		});

		test("when it is a RENAVAM with invalid checksum (639884963 has its last digit changed from the valid 639884962)", () => {
			expect(isValidRenavam("639884963")).toBe(false);
			expect(isValidRenavam("12345678901")).toBe(false);
		});

		test("when it has mixed characters that sanitize to an invalid RENAVAM (invalid checksum)", () => {
			expect(isValidRenavam("12345678901abc")).toBe(false);
			expect(isValidRenavam("639884963xyz")).toBe(false);
		});

		test("when letters are attached to an otherwise valid RENAVAM", () => {
			expect(isValidRenavam("639884962abc")).toBe(false);
			expect(isValidRenavam("ab00639884962")).toBe(false);
		});

		test("when the mask uses a character other than whitespace, a dot or a hyphen", () => {
			expect(isValidRenavam("0063988/4962")).toBe(false);
		});

		test("when every digit is the same", () => {
			expect(isValidRenavam("00000000000")).toBe(false);
			expect(isValidRenavam("000000000")).toBe(false);
		});

		test("when is a RENAVAM with invalid length: 8 digits (too short), 10 digits (invalid), or 12 digits (too long)", () => {
			expect(isValidRenavam("12345678")).toBe(false);
			expect(isValidRenavam("1234567890")).toBe(false);
			expect(isValidRenavam("123456789012")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("when is a RENAVAM valid with 9 digits (old format)", () => {
			expect(isValidRenavam("639884962")).toBe(true);
		});

		test("when is a RENAVAM valid with 11 digits (new format)", () => {
			expect(isValidRenavam("00639884962")).toBe(true);
		});

		test("when is a RENAVAM valid as number", () => {
			expect(isValidRenavam(639_884_962)).toBe(true);
		});

		test("when is a RENAVAM valid with the usual mask characters", () => {
			expect(isValidRenavam("0063988.4962")).toBe(true);
			expect(isValidRenavam("00639884-962")).toBe(true);
			expect(isValidRenavam(" 00639884962 ")).toBe(true);
		});

		test("when the multiplier cycle wraps from 9 back to 2 on non-zero digits", () => {
			expect(isValidRenavam("12345678900")).toBe(true);
		});

		test("when the checksum remainder is exactly 1 (expected digit 0, not 10)", () => {
			expect(isValidRenavam("00000000060")).toBe(true);
		});
	});

	describe("properties", () => {
		test("should accept exactly one check digit for any base", () => {
			fc.assert(
				fc.property(fc.stringMatching(/^[0-9]{10}$/), (base) => {
					fc.pre(!/^(\d)\1{9}$/.test(base));

					const accepted = RENAVAM_DIGITS.filter((digit) => isValidRenavam(`${base}${digit}`));

					expect(accepted.length).toBe(1);
				}),
			);
		});

		test("should read a nine digit registration as its zero padded form", () => {
			fc.assert(
				fc.property(fc.stringMatching(/^[0-9]{9}$/), (value) => {
					const masked = `${value.slice(0, 4)}.${value.slice(4)}`;

					expect(isValidRenavam(`00${value}`)).toBe(isValidRenavam(value));
					expect(isValidRenavam(masked)).toBe(isValidRenavam(value));
				}),
			);
		});

		test("should reject any value whose length is neither nine nor eleven", () => {
			fc.assert(
				fc.property(fc.stringMatching(/^[0-9]{0,16}$/), (value) => {
					fc.pre(value.length !== 9 && value.length !== 11);

					expect(isValidRenavam(value)).toBe(false);
				}),
			);
		});

		test("should never throw and always judge a RENAVAM with a boolean", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					expect(typeof isValidRenavam(value as string)).toBe("boolean");
				}),
			);
		});
	});
});

describe("isValidRenavam types", () => {
	test("should take a string or number and return a boolean", () => {
		expectTypeOf(isValidRenavam).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(isValidRenavam).returns.toEqualTypeOf<boolean>();
	});
});
