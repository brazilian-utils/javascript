import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isValidPassport } from "../is-valid-passport/is-valid-passport";
import { generatePassport } from "./generate-passport";

describe("generatePassport", () => {
	test("should always generate a valid passport", () => {
		for (let i = 0; i < 100; i++) {
			expect(isValidPassport(generatePassport())).toBe(true);
		}
	});

	test("should map a forced random value to the hand-computed letters and digits", () => {
		const originalRandom = Math.random;

		Math.random = () => 0.5;

		try {
			expect(generatePassport()).toBe("NN555555");
		} finally {
			Math.random = originalRandom;
		}
	});

	describe("properties", () => {
		const batchSize = fc.integer({ min: 1, max: 20 });

		test("should generate passports its own validator accepts", () => {
			fc.assert(
				fc.property(batchSize, (size) => {
					for (let index = 0; index < size; index++) {
						const passport = generatePassport();

						expect(passport).toMatch(/^[A-Z]{2}\d{6}$/);
						expect(isValidPassport(passport)).toBe(true);
					}
				}),
			);
		});
	});
});

describe("generatePassport types", () => {
	test("should take no parameters and return a string", () => {
		expectTypeOf(generatePassport).parameters.toEqualTypeOf<[]>();
		expectTypeOf(generatePassport).returns.toEqualTypeOf<string>();
	});
});
