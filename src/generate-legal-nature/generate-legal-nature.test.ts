import * as fc from "fast-check";

import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isValidLegalNature } from "../is-valid-legal-nature/is-valid-legal-nature";
import { generateLegalNature } from "./generate-legal-nature";

describe("generateLegalNature", () => {
	it("should generate valid legal nature values", () => {
		for (let i = 0; i < 50; i++) {
			expect(isValidLegalNature(generateLegalNature())).toBe(true);
		}
	});

	it("should map a forced random value to the hand-computed code at that index, not always the first entry", () => {
		const originalRandom = Math.random;

		Math.random = () => 0.5;

		try {
			expect(generateLegalNature()).toBe("2216");
		} finally {
			Math.random = originalRandom;
		}
	});

	describe("properties", () => {
		const batchSize = fc.integer({ min: 1, max: 20 });

		test("should only draw 4 digit codes its own validator accepts", () => {
			fc.assert(
				fc.property(batchSize, (size) => {
					for (let index = 0; index < size; index++) {
						const code = generateLegalNature();

						expect(code).toMatch(/^\d{4}$/);
						expect(isValidLegalNature(code)).toBe(true);
					}
				}),
			);
		});
	});
});

describe("generateLegalNature types", () => {
	test("should take no parameters and return a string", () => {
		expectTypeOf(generateLegalNature).parameters.toEqualTypeOf<[]>();
		expectTypeOf(generateLegalNature).returns.toEqualTypeOf<string>();
	});
});
