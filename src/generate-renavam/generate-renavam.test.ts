import * as fc from "fast-check";

import { bench, describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isValidRenavam } from "../is-valid-renavam/is-valid-renavam";
import { generateRenavam } from "./generate-renavam";

const generateWithDrawnDigits = (drawn: string): string => {
	const realRandom = Math.random;
	let position = 0;

	Math.random = (): number => {
		const drawnDigit = Number(drawn.charAt(position));
		position += 1;

		return (drawnDigit + 0.5) / 10;
	};

	try {
		return generateRenavam();
	} finally {
		Math.random = realRandom;
	}
};

describe("generateRenavam", () => {
	test("should have the right length without mask (11)", () => {
		expect(generateRenavam()).toHaveLength(11);
		expect(/^\d{11}$/.test(generateRenavam())).toBe(true);
	});

	test("should always generate a valid RENAVAM", () => {
		for (let i = 0; i < 1000; i++) {
			expect(isValidRenavam(generateRenavam())).toBe(true);
		}
	});

	test("should regenerate the base when it comes out with repeated digits", () => {
		expect(generateWithDrawnDigits("00000000001234567890")).toBe("12345678900");
	});

	test("should keep a check digit of 0 when the weighted product leaves a remainder of 10", () => {
		expect(generateWithDrawnDigits("0000000006")).toBe("00000000060");
	});

	test("should append the check digit the validator expects for a drawn base", () => {
		expect(generateWithDrawnDigits("0063988496")).toBe("00639884962");
		expect(generateWithDrawnDigits("9000000000")).toBe("90000000006");
	});

	describe("properties", () => {
		const batchSize = fc.integer({ min: 1, max: 20 });

		test("should generate 11 digit RENAVAM numbers its own validator accepts", () => {
			fc.assert(
				fc.property(batchSize, (size) => {
					for (let index = 0; index < size; index++) {
						const renavam = generateRenavam();

						expect(renavam).toMatch(/^\d{11}$/);
						expect(/^(\d)\1{9}/.test(renavam)).toBe(false);
						expect(isValidRenavam(renavam)).toBe(true);
					}
				}),
			);
		});

		test("should generate registrations the usual mask characters do not change", () => {
			fc.assert(
				fc.property(batchSize, (size) => {
					for (let index = 0; index < size; index++) {
						const renavam = generateRenavam();

						expect(isValidRenavam(`${renavam.slice(0, 7)}.${renavam.slice(7)}`)).toBe(true);
						expect(isValidRenavam(` ${renavam.slice(0, 10)}-${renavam.slice(10)} `)).toBe(true);
					}
				}),
			);
		});
	});
});

describe("generateRenavam types", () => {
	test("should take no parameters and return a string", () => {
		expectTypeOf(generateRenavam).parameters.toEqualTypeOf<[]>();
		expectTypeOf(generateRenavam).returns.toEqualTypeOf<string>();
	});
});

describe("generateRenavam benchmarks", () => {
	bench("generate a RENAVAM", () => {
		generateRenavam();
	});
});
