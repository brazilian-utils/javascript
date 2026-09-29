import * as fc from "fast-check";

import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { getStateByCep } from "../get-state-by-cep/get-state-by-cep";
import { isValidCep } from "../is-valid-cep/is-valid-cep";
import { generateCep } from "./generate-cep";

const withRandom = (value: number): string => {
	const original = Math.random;

	Math.random = (): number => value;

	try {
		return generateCep();
	} finally {
		Math.random = original;
	}
};

describe("generateCep", () => {
	it("should generate a valid CEP", () => {
		expect(generateCep()).toMatch(/^\d{8}$/);
	});

	it("should draw the first CEP of the São Paulo range when the random number is 0", () => {
		expect(withRandom(0)).toBe("01000000");
	});

	it("should draw the last CEP of the Rio Grande do Sul range when the random number is the highest below 1", () => {
		expect(withRandom(1 - Number.EPSILON / 2)).toBe("99999999");
	});

	it("should draw the CEPs of the ranges in order, each CEP with the same chance", () => {
		expect(withRandom(0.5)).toBe("50450000");
		expect(withRandom(0.75)).toBe("75175000");
	});

	it("should skip the 78900-000 to 78999-999 gap no state owns", () => {
		expect(withRandom(0.875)).toBe("87637500");
		expect(withRandom(77_899_999 / 98_900_000)).toBe("78899999");
		expect(withRandom(77_900_000 / 98_900_000)).toBe("79000000");
	});

	describe("properties", () => {
		const batchSize = fc.integer({ min: 1, max: 20 });
		const randomNumber = fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true });

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

		test("should generate a CEP some state owns, whatever the random number", () => {
			fc.assert(
				fc.property(randomNumber, (value) => {
					const cep = withRandom(value);

					expect(cep).toMatch(/^\d{8}$/);
					expect(getStateByCep(cep)).not.toBeNull();
				}),
			);
		});

		test("should never generate a CEP from the ranges no state owns", () => {
			fc.assert(
				fc.property(randomNumber, (value) => {
					const cep = Number(withRandom(value));

					expect(cep).toBeGreaterThanOrEqual(1_000_000);
					expect(cep < 78_900_000 || cep > 78_999_999).toBe(true);
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
