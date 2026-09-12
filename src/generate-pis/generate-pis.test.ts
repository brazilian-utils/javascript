import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isValidPis } from "../is-valid-pis/is-valid-pis";
import { generatePis } from "./generate-pis";

describe("generatePis", () => {
	test("should have the right length without mask (11)", () => {
		expect(generatePis()).toHaveLength(11);
		expect(/^\d{11}$/.test(generatePis())).toBe(true);
	});

	test("should always generate a valid PIS", () => {
		for (let i = 0; i < 1000; i++) {
			expect(isValidPis(generatePis())).toBe(true);
		}
	});

	test("should regenerate the base when it comes out with repeated digits", () => {
		const digits = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
		const originalRandom = Math.random;
		let call = 0;

		Math.random = () => {
			const digit = digits[call];
			call += 1;
			return (digit + 0.5) / 10;
		};

		try {
			const pis = generatePis();

			expect(pis.slice(0, 10)).toBe("1234567890");
			expect(isValidPis(pis)).toBe(true);
		} finally {
			Math.random = originalRandom;
		}
	});

	describe("properties", () => {
		const batchSize = fc.integer({ min: 1, max: 20 });

		test("should generate 11 digit PIS numbers its own validator accepts", () => {
			fc.assert(
				fc.property(batchSize, (size) => {
					for (let index = 0; index < size; index++) {
						const pis = generatePis();

						expect(pis).toMatch(/^\d{11}$/);
						expect(/^(\d)\1{9}/.test(pis)).toBe(false);
						expect(isValidPis(pis)).toBe(true);
					}
				}),
			);
		});
	});
});

describe("generatePis types", () => {
	test("should take no parameters and return a string", () => {
		expectTypeOf(generatePis).parameters.toEqualTypeOf<[]>();
		expectTypeOf(generatePis).returns.toEqualTypeOf<string>();
	});
});
