import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isValidCei } from "./is-valid-cei";

const LAST_DIGITS = Array.from({ length: 10 }, (_, digit) => String(digit));

const findCei = (base: string): string =>
	LAST_DIGITS.map((digit) => `${base}${digit}`).find((value) => isValidCei(value)) ?? "";

describe("isValidCei", () => {
	describe("should return false", () => {
		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCei(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCei()).toBe(false);
		});

		test("when it is a boolean", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCei(true)).toBe(false);
		});

		test("when it is an empty string", () => {
			expect(isValidCei("")).toBe(false);
		});

		test("when it does not have 12 digits", () => {
			expect(isValidCei("1234567890")).toBe(false);
			expect(isValidCei("1234567890123")).toBe(false);
		});

		test("when it has 12 digits but an unsupported separator", () => {
			expect(isValidCei("11#583#00249#85")).toBe(false);
		});

		test("when it has 12 digits grouped outside the 2-3-5-2 mask", () => {
			expect(isValidCei("115.830.02498/5")).toBe(false);
		});

		test("when it contains letters", () => {
			expect(isValidCei("aa.583.00249/85")).toBe(false);
		});

		test("when every digit is the same", () => {
			expect(isValidCei("000000000000")).toBe(false);
			expect(isValidCei("111111111111")).toBe(false);
		});

		test("when the check digit does not match (24.985.96743/68, yiibr/yii2-br-validator and marcos-cruz/Documento invalid case)", () => {
			expect(isValidCei("24.985.96743/68")).toBe(false);
			expect(isValidCei("249859674368")).toBe(false);
		});

		test("when only the check digit is wrong (11.583.00249/85 with a 4)", () => {
			expect(isValidCei("115830024984")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("for 11.583.00249/85 (yiibr/yii2-br-validator CeiValidatorTest)", () => {
			expect(isValidCei("11.583.00249/85")).toBe(true);
			expect(isValidCei("115830024985")).toBe(true);
		});

		test("for 27.729.71181/87 (yiibr/yii2-br-validator CeiValidatorTest)", () => {
			expect(isValidCei("27.729.71181/87")).toBe(true);
			expect(isValidCei("277297118187")).toBe(true);
		});

		test("for 24.985.96743/86 (marcos-cruz/Documento CeiTest)", () => {
			expect(isValidCei("24.985.96743/86")).toBe(true);
		});

		test("for 20.381.44217/87 (marcos-cruz/Documento CeiTest)", () => {
			expect(isValidCei("20.381.44217/87")).toBe(true);
		});

		test("for 27.247.25187/86 (marcos-cruz/Documento CeiTest)", () => {
			expect(isValidCei("27.247.25187/86")).toBe(true);
		});

		test("for a number input", () => {
			expect(isValidCei(249_859_674_386)).toBe(true);
		});

		test("for a whitespace mask and surrounding whitespace", () => {
			expect(isValidCei(" 11 583 00249 85 ")).toBe(true);
		});
	});

	describe("properties", () => {
		const bases = fc.stringMatching(/^[0-9]{11}$/);

		test("should accept at most one check digit for any base", () => {
			fc.assert(
				fc.property(bases, (base) => {
					const accepted = LAST_DIGITS.filter((digit) => isValidCei(`${base}${digit}`));

					expect(accepted.length).toBeLessThanOrEqual(1);
				}),
			);
		});

		test("should read the same number with and without the official mask", () => {
			fc.assert(
				fc.property(bases, (base) => {
					const value = findCei(base);

					fc.pre(value !== "");

					const masked = `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 10)}/${value.slice(10)}`;

					expect(isValidCei(masked)).toBe(true);
				}),
			);
		});

		test("should reject a number made of a single repeated digit", () => {
			fc.assert(
				fc.property(fc.constantFrom(...LAST_DIGITS), (digit) => {
					expect(isValidCei(digit.repeat(12))).toBe(false);
				}),
			);
		});

		test("should never throw and always judge a CEI number with a boolean", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					expect(typeof isValidCei(value as string)).toBe("boolean");
				}),
			);
		});
	});
});

describe("isValidCei types", () => {
	test("should take a string or number and return a boolean", () => {
		expectTypeOf(isValidCei).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(isValidCei).returns.toEqualTypeOf<boolean>();
	});
});
