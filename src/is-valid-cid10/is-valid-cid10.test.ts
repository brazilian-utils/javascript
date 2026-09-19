import * as fc from "fast-check";

import { CID10_SUBCATEGORIES } from "../_internals/constants/cid10";
import { CID10_DESCRIPTIONS } from "../_internals/constants/cid10-descriptions";
import { anyGarbage, PROTOTYPE_KEYS } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isValidCid10 } from "./is-valid-cid10";

describe("isValidCid10", () => {
	it("should validate a subcategory written with the dot", () => {
		expect(isValidCid10("A00.0")).toBe(true);
		expect(isValidCid10("A00.1")).toBe(true);
		expect(isValidCid10("A00.9")).toBe(true);
	});

	it("should validate a subcategory written without the dot", () => {
		expect(isValidCid10("A000")).toBe(true);
		expect(isValidCid10("F322")).toBe(true);
	});

	it("should validate a category, subdivided or not", () => {
		expect(isValidCid10("A00")).toBe(true);
		expect(isValidCid10("I10")).toBe(true);
	});

	it("should validate the first and the last code of the table", () => {
		expect(isValidCid10("A00")).toBe(true);
		expect(isValidCid10("Z99.9")).toBe(true);
	});

	it("should ignore the letter case and surrounding whitespace", () => {
		expect(isValidCid10("m54.5")).toBe(true);
		expect(isValidCid10(" M545 ")).toBe(true);
	});

	it("should reject a subcategory its category does not have", () => {
		expect(isValidCid10("A00.2")).toBe(false);
		expect(isValidCid10("A00.5")).toBe(false);
		expect(isValidCid10("A008")).toBe(false);
	});

	it("should reject any subcategory of a category that is not subdivided", () => {
		expect(isValidCid10("I10.0")).toBe(false);
		expect(isValidCid10("I109")).toBe(false);
	});

	it("should reject a category the table does not have", () => {
		expect(isValidCid10("A10")).toBe(false);
		expect(isValidCid10("A10.0")).toBe(false);
		expect(isValidCid10("U07.1")).toBe(false);
	});

	it("should reject a value that is not written in a documented form", () => {
		expect(isValidCid10("")).toBe(false);
		expect(isValidCid10("   ")).toBe(false);
		expect(isValidCid10("A0")).toBe(false);
		expect(isValidCid10("A00-0")).toBe(false);
		expect(isValidCid10("A00.00")).toBe(false);
		expect(isValidCid10("A00.0 Cólera")).toBe(false);
	});

	it("should reject the keys of Object.prototype", () => {
		for (const key of PROTOTYPE_KEYS) {
			expect(isValidCid10(key)).toBe(false);
		}
	});

	it("should reject a value that is not a string", () => {
		// @ts-expect-error not a string
		expect(isValidCid10(null)).toBe(false);
		// @ts-expect-error not a string
		expect(isValidCid10()).toBe(false);
		// @ts-expect-error not a string
		expect(isValidCid10(100)).toBe(false);
		// @ts-expect-error not a string
		expect(isValidCid10(["A00"])).toBe(false);
	});

	describe("the code table", () => {
		it("should hold exactly the codes the description table holds", () => {
			const codes: string[] = [];

			for (const [category, subcategories] of Object.entries(CID10_SUBCATEGORIES)) {
				codes.push(category);

				for (const subcategory of subcategories) codes.push(category + subcategory);
			}

			expect(codes.toSorted()).toEqual(Object.keys(CID10_DESCRIPTIONS).toSorted());
		});

		it("should hold the 2045 categories and 12188 subcategories of CID-10 V2008", () => {
			const codes = Object.keys(CID10_DESCRIPTIONS);

			expect(codes.filter((code) => code.length === 3)).toHaveLength(2045);
			expect(codes.filter((code) => code.length === 4)).toHaveLength(12_188);
		});
	});

	describe("properties", () => {
		const codeArbitrary = fc.constantFrom(...Object.keys(CID10_DESCRIPTIONS));

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(isValidCid10, anyGarbage);
		});

		test("should validate every known code, in either case", () => {
			fc.assert(
				fc.property(codeArbitrary, (code) => {
					expect(isValidCid10(code)).toBe(true);
					expect(isValidCid10(code.toLowerCase())).toBe(true);
				}),
			);
		});

		test("should validate every known subcategory with the dot", () => {
			fc.assert(
				fc.property(
					codeArbitrary.filter((code) => code.length === 4),
					(code) => {
						expect(isValidCid10(`${code.slice(0, 3)}.${code.slice(3)}`)).toBe(true);
					},
				),
			);
		});
	});
});

describe("isValidCid10 types", () => {
	test("should take a string and return a boolean", () => {
		expectTypeOf(isValidCid10).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(isValidCid10).returns.toEqualTypeOf<boolean>();
	});
});
