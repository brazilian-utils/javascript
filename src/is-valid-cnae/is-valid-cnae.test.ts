import * as fc from "fast-check";

import { CNAE_SUBCLASSES } from "../_internals/constants/cnae";
import { anyGarbage } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isValidCnae } from "./is-valid-cnae";

describe("isValidCnae", () => {
	it("should validate a CNAE code without a mask", () => {
		expect(isValidCnae("6201501")).toBe(true);
	});

	it("should validate a CNAE code with the NNNN-N/NN mask", () => {
		expect(isValidCnae("6201-5/01")).toBe(true);
	});

	it("should validate a CNAE code given as a number", () => {
		expect(isValidCnae(6_201_501)).toBe(true);
	});

	it("should pad a value with leading zeros before looking it up, as a number or as a string", () => {
		expect(isValidCnae(111_301)).toBe(true);
		expect(isValidCnae("0111301")).toBe(true);
		expect(isValidCnae("111301")).toBe(true);
	});

	it("should not pad a masked value, which already carries its separators", () => {
		expect(isValidCnae("111-3/01")).toBe(false);
		expect(isValidCnae("0111-3/01")).toBe(true);
	});

	it("should validate a CNAE code with surrounding whitespace", () => {
		expect(isValidCnae(" 6201501 ")).toBe(true);
	});

	it("should reject a group boundary written with more than one separator (6201--5//01)", () => {
		expect(isValidCnae("6201--5//01")).toBe(false);
		expect(isValidCnae("6201-5/01")).toBe(true);
	});

	it("should return false for an unknown seven digit code", () => {
		expect(isValidCnae("0000000")).toBe(false);
	});

	it("should return false for a padded short value no subclass carries and for a wider value", () => {
		expect(isValidCnae("620150")).toBe(false);
		expect(isValidCnae("62015011")).toBe(false);
	});

	it("should return false for an empty string", () => {
		expect(isValidCnae("")).toBe(false);
	});

	it("should return false for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(isValidCnae(null)).toBe(false);
		// @ts-expect-error not a string or number
		expect(isValidCnae()).toBe(false);
	});

	it("should return false for whitespace only", () => {
		expect(isValidCnae("       ")).toBe(false);
	});

	it("should return false for a non numeric string", () => {
		expect(isValidCnae("abcdefg")).toBe(false);
	});

	it("should accept the separators the mask uses between the three groups", () => {
		expect(isValidCnae("6201 5 01")).toBe(true);
		expect(isValidCnae("6201.5.01")).toBe(true);
	});

	it("should return false for a string that is not written in a documented form", () => {
		expect(isValidCnae("0111abc301")).toBe(false);
		expect(isValidCnae("62-01501")).toBe(false);
		expect(isValidCnae("+6201501")).toBe(false);
	});

	it("should return false for a number that is not a non-negative safe integer", () => {
		expect(isValidCnae(-111_301)).toBe(false);
		expect(isValidCnae(6201.501)).toBe(false);
		expect(isValidCnae(2 ** 53)).toBe(false);
	});

	describe("properties", () => {
		const codeArbitrary = fc.constantFrom(...Object.keys(CNAE_SUBCLASSES));

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(isValidCnae, anyGarbage);
		});

		test("should validate every known code, with or without the mask", () => {
			fc.assert(
				fc.property(codeArbitrary, (code) => {
					const masked = `${code.slice(0, 4)}-${code.slice(4, 5)}/${code.slice(5)}`;

					expect(isValidCnae(code)).toBe(true);
					expect(isValidCnae(masked)).toBe(true);
				}),
			);
		});
	});
});

describe("isValidCnae types", () => {
	test("should take a string or number and return a boolean", () => {
		expectTypeOf(isValidCnae).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(isValidCnae).returns.toEqualTypeOf<boolean>();
	});
});
