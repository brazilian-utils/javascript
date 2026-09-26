import * as fc from "fast-check";

import { CEST_CODES } from "../_internals/constants/cest";
import { CEST_DESCRIPTIONS } from "../_internals/constants/cest-descriptions";
import { anyGarbage, digitsOfOtherLength } from "../_internals/test/arbitraries";
import { lookupTable } from "../_internals/test/lookup-table";
import { expectNeverThrows, expectRejected } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isValidCest } from "./is-valid-cest";

const CEST_TABLE = lookupTable(CEST_CODES, 7, CEST_DESCRIPTIONS);

describe("isValidCest", () => {
	it("should validate a CEST without a mask", () => {
		expect(isValidCest("0100100")).toBe(true);
	});

	it("should validate a CEST in the NN.NNN.NN form", () => {
		expect(isValidCest("01.001.00")).toBe(true);
		expect(isValidCest("28.999.00")).toBe(true);
	});

	it("should validate a bare code that lost its leading zero, as a number or as a string", () => {
		expect(isValidCest(100_100)).toBe(true);
		expect(isValidCest("100100")).toBe(true);
	});

	it("should validate the specifications of an item (03.021.00 to 03.021.06)", () => {
		expect(isValidCest("03.021.00")).toBe(true);
		expect(isValidCest("03.021.06")).toBe(true);
		expect(isValidCest("03.021.07")).toBe(false);
	});

	it("should reject a revoked item", () => {
		expect(isValidCest("03.001.00")).toBe(false);
		expect(isValidCest("01.110.00")).toBe(false);
		expect(isValidCest("10.023.00")).toBe(false);
	});

	it("should reject an unknown code", () => {
		expect(isValidCest("0000000")).toBe(false);
		expect(isValidCest("9999999")).toBe(false);
	});

	it("should reject a value that is not a documented form", () => {
		expect(isValidCest("")).toBe(false);
		expect(isValidCest("abc0100100")).toBe(false);
		expect(isValidCest("01.001.00.")).toBe(false);
		expect(isValidCest("1.001.00")).toBe(false);
	});

	it("should reject a number that is not a non-negative safe integer", () => {
		expect(isValidCest(-100_100)).toBe(false);
		expect(isValidCest(10_010.5)).toBe(false);
	});

	it("should reject values that are not a string or a number", () => {
		// @ts-expect-error not a string or number
		expect(isValidCest(null)).toBe(false);
		// @ts-expect-error not a string or number
		expect(isValidCest()).toBe(false);
		// @ts-expect-error not a string or number
		expect(isValidCest({ toString: () => "0100100" })).toBe(false);
	});

	describe("properties", () => {
		const codeArbitrary = fc.constantFrom(...Object.keys(CEST_TABLE));

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(isValidCest, anyGarbage);
		});

		test("should validate every known code, with or without the mask", () => {
			fc.assert(
				fc.property(codeArbitrary, (code) => {
					const masked = `${code.slice(0, 2)}.${code.slice(2, 5)}.${code.slice(5)}`;

					expect(isValidCest(code)).toBe(true);
					expect(isValidCest(masked)).toBe(true);
				}),
			);
		});

		test("should reject every digit string longer than a CEST", () => {
			expectRejected(isValidCest, digitsOfOtherLength(12, [0, 1, 2, 3, 4, 5, 6, 7]));
		});
	});
});

describe("isValidCest types", () => {
	test("should take a string or number and return a boolean", () => {
		expectTypeOf(isValidCest).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(isValidCest).returns.toEqualTypeOf<boolean>();
	});
});
