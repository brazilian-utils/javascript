import * as fc from "fast-check";

import {
	anyGarbage,
	anyText,
	digitsOfOtherLength,
	PROTOTYPE_KEYS,
} from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectNeverThrowsWithOptions,
	expectRejected,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { type GtinLength, type IsValidGtinOptions, isValidGtin } from "./is-valid-gtin";

const GTIN_8 = "78912342";
const GTIN_12 = "061414112345";
const GTIN_13 = "7890000000017";
const GTIN_14 = "17890000000014";

describe("isValidGtin", () => {
	describe("should return true", () => {
		test("for a GTIN-8", () => {
			expect(isValidGtin(GTIN_8)).toBe(true);
		});

		test("for a GTIN-12, the U.P.C. example of the GS1 General Specifications", () => {
			expect(isValidGtin(GTIN_12)).toBe(true);
		});

		test("for a GTIN-13 with each prefix of GS1 Brasil", () => {
			expect(isValidGtin(GTIN_13)).toBe(true);
			expect(isValidGtin("7901234567891")).toBe(true);
		});

		test("for a GTIN-14", () => {
			expect(isValidGtin(GTIN_14)).toBe(true);
		});

		test("for the examples GS1 publishes", () => {
			expect(isValidGtin("6291041500213")).toBe(true);
			expect(isValidGtin("9521234500018")).toBe(true);
			expect(isValidGtin("09524141234564")).toBe(true);
		});

		test("for a prefix that is not Brazilian", () => {
			expect(isValidGtin("7880000000018")).toBe(true);
		});

		test("for a Restricted Circulation Number and for an ISSN or ISBN, which share the structure", () => {
			expect(isValidGtin("2000000000015")).toBe(true);
			expect(isValidGtin("0400000000015")).toBe(true);
			expect(isValidGtin("9771234567003")).toBe(true);
			expect(isValidGtin("9780000000019")).toBe(true);
		});

		test("with surrounding whitespace", () => {
			expect(isValidGtin(` ${GTIN_13}\t`)).toBe(true);
		});
	});

	describe("should return false", () => {
		test("when the value is not a string", () => {
			expect(isValidGtin(7_890_000_000_017 as unknown as string)).toBe(false);
			expect(isValidGtin(null as unknown as string)).toBe(false);
			expect(isValidGtin(undefined as unknown as string)).toBe(false);
			expect(isValidGtin({} as unknown as string)).toBe(false);
			expect(isValidGtin([GTIN_13] as unknown as string)).toBe(false);
		});

		test("when the value is empty", () => {
			expect(isValidGtin("")).toBe(false);
		});

		test("when the value is the literal the NF-e uses for a product without a GTIN", () => {
			expect(isValidGtin("SEM GTIN")).toBe(false);
		});

		test("when the check digit is wrong", () => {
			expect(isValidGtin("78912343")).toBe(false);
			expect(isValidGtin("061414112346")).toBe(false);
			expect(isValidGtin("7890000000018")).toBe(false);
			expect(isValidGtin("17890000000015")).toBe(false);
		});

		test("when the length is not 8, 12, 13 or 14", () => {
			expect(isValidGtin("789000017")).toBe(false);
			expect(isValidGtin("78900000017")).toBe(false);
			expect(isValidGtin("376104250021234569")).toBe(false);
		});

		test("when the value carries a mask or a letter", () => {
			expect(isValidGtin("7 890000 000017")).toBe(false);
			expect(isValidGtin("789000000001X")).toBe(false);
		});
	});

	describe("with the lengths option", () => {
		test("should accept only the lengths it lists", () => {
			expect(isValidGtin(GTIN_13, { lengths: [13] })).toBe(true);
			expect(isValidGtin(GTIN_8, { lengths: [13] })).toBe(false);
			expect(isValidGtin(GTIN_12, { lengths: [13] })).toBe(false);
			expect(isValidGtin(GTIN_14, { lengths: [13] })).toBe(false);
			expect(isValidGtin(GTIN_14, { lengths: [8, 12, 13] })).toBe(false);
			expect(isValidGtin(GTIN_8, { lengths: [8, 14] })).toBe(true);
			expect(isValidGtin(GTIN_14, { lengths: [8, 14] })).toBe(true);
		});

		test("should accept nothing when the list is empty", () => {
			expect(isValidGtin(GTIN_13, { lengths: [] })).toBe(false);
		});

		test("should still turn down a wrong check digit of a listed length", () => {
			expect(isValidGtin("7890000000018", { lengths: [13] })).toBe(false);
		});

		test("should accept the four lengths when it is left out or is not a list", () => {
			expect(isValidGtin(GTIN_8, {})).toBe(true);
			expect(isValidGtin(GTIN_14, { lengths: undefined })).toBe(true);
			expect(isValidGtin(GTIN_13, null as unknown as IsValidGtinOptions)).toBe(true);
			expect(isValidGtin(GTIN_13, { lengths: "8" } as unknown as IsValidGtinOptions)).toBe(true);
			expect(isValidGtin(GTIN_13, { lengths: 8 } as unknown as IsValidGtinOptions)).toBe(true);
		});
	});

	describe("properties", () => {
		test("should reject every digit string of another length", () => {
			expectRejected(isValidGtin, digitsOfOtherLength(20, [8, 12, 13, 14]));
		});

		test("should accept exactly one check digit for any 12 digit body", () => {
			fc.assert(
				fc.property(fc.stringMatching(/^[0-9]{12}$/), (body) => {
					const accepted = Array.from({ length: 10 }, (_, digit) => `${body}${digit}`).filter(
						(candidate) => isValidGtin(candidate),
					);

					expect(accepted).toHaveLength(1);
				}),
			);
		});

		test("should never accept with a list of lengths what it turns down without one", () => {
			fc.assert(
				fc.property(
					fc.stringMatching(/^[0-9]{8,14}$/),
					fc.subarray<GtinLength>([8, 12, 13, 14]),
					(value, lengths) => {
						expect(isValidGtin(value, { lengths }) && !isValidGtin(value)).toBe(false);
					},
				),
			);
		});

		test("should always return a boolean and never throw", () => {
			expectAlwaysReturnsType(isValidGtin, "boolean", fc.oneof(anyText, fc.anything()));
			expectAlwaysReturnsType(isValidGtin, "boolean", fc.constantFrom(...PROTOTYPE_KEYS));
			expectNeverThrowsWithOptions(isValidGtin, fc.oneof(anyText, anyGarbage), anyGarbage);
		});
	});
});

describe("isValidGtin types", () => {
	test("should take a string and optional options and return a boolean", () => {
		expectTypeOf(isValidGtin).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(isValidGtin).parameter(1).toEqualTypeOf<IsValidGtinOptions | undefined>();
		expectTypeOf(isValidGtin).returns.toEqualTypeOf<boolean>();
		expectTypeOf<IsValidGtinOptions>().toEqualTypeOf<{ lengths?: GtinLength[] }>();
	});
});
