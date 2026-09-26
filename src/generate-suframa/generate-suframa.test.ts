import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isValidSuframa } from "../is-valid-suframa/is-valid-suframa";
import { generateSuframa } from "./generate-suframa";

const withRandomDigits = (digits: number[], run: () => void): void => {
	const originalRandom = Math.random;
	let call = 0;

	Math.random = () => {
		const digit = digits[call];
		call += 1;
		return (digit + 0.5) / 10;
	};

	try {
		run();
	} finally {
		Math.random = originalRandom;
	}
};

describe("generateSuframa", () => {
	test("should have the right length without mask (9)", () => {
		expect(generateSuframa()).toHaveLength(9);
		expect(/^\d{9}$/.test(generateSuframa())).toBe(true);
	});

	test("should always generate a valid Inscrição SUFRAMA", () => {
		for (let i = 0; i < 1000; i++) {
			expect(isValidSuframa(generateSuframa())).toBe(true);
		}
	});

	test("should append the check digit of the NF-e manual example", () => {
		withRandomDigits([1, 2, 3, 4, 5, 6, 7, 8], () => {
			expect(generateSuframa()).toBe("123456789");
		});
	});

	test("should append 0 when the remainder is 0 or 1", () => {
		withRandomDigits([1, 0, 0, 0, 0, 0, 0, 1], () => {
			expect(generateSuframa()).toBe("100000010");
		});
		withRandomDigits([6, 0, 0, 0, 0, 1, 3, 0], () => {
			expect(generateSuframa()).toBe("600001300");
		});
	});

	test("should regenerate the base when the sector code comes out as 00", () => {
		withRandomDigits([0, 0, 1, 2, 3, 4, 5, 6, 0, 1, 0, 0, 0, 1, 0, 1], () => {
			expect(generateSuframa()).toBe("010001018");
		});
	});

	describe("properties", () => {
		const batchSize = fc.integer({ min: 1, max: 20 });

		test("should generate 9 digit numbers its own validator accepts, never with sector code 00", () => {
			fc.assert(
				fc.property(batchSize, (size) => {
					for (let index = 0; index < size; index++) {
						const suframa = generateSuframa();

						expect(suframa).toMatch(/^\d{9}$/);
						expect(suframa.startsWith("00")).toBe(false);
						expect(isValidSuframa(suframa)).toBe(true);
					}
				}),
			);
		});
	});
});

describe("generateSuframa types", () => {
	test("should take no parameters and return a string", () => {
		expectTypeOf(generateSuframa).parameters.toEqualTypeOf<[]>();
		expectTypeOf(generateSuframa).returns.toEqualTypeOf<string>();
	});
});
