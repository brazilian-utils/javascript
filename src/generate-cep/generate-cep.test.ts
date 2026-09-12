import * as fc from "fast-check";

import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isValidCep } from "../is-valid-cep/is-valid-cep";
import { generateCep } from "./generate-cep";

describe("generateCep", () => {
	it("should generate a valid CEP", () => {
		expect(generateCep()).toMatch(/^\d{8}$/);
	});

	describe("properties", () => {
		const batchSize = fc.integer({ min: 1, max: 20 });

		test("should generate 8 digit CEPs its own validator accepts", () => {
			fc.assert(
				fc.property(batchSize, (size) => {
					for (let index = 0; index < size; index++) {
						const cep = generateCep();

						expect(cep).toMatch(/^\d{8}$/);
						expect(isValidCep(cep)).toBe(true);
					}
				}),
			);
		});
	});
});

describe("generateCep types", () => {
	test("should take no parameters and return a string", () => {
		expectTypeOf(generateCep).parameters.toEqualTypeOf<[]>();
		expectTypeOf(generateCep).returns.toEqualTypeOf<string>();
	});
});
