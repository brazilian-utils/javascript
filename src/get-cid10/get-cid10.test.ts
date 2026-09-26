import * as fc from "fast-check";

import { CID10_DESCRIPTIONS } from "../_internals/constants/cid10-descriptions";
import { anyGarbage, PROTOTYPE_KEYS } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isValidCid10 } from "../is-valid-cid10/is-valid-cid10";
import { getCid10, type Cid10 } from "./get-cid10";

describe("getCid10", () => {
	it("should return a subcategory written with the dot", () => {
		expect(getCid10("A00.0")).toEqual({
			code: "A000",
			description: "Cólera devida a Vibrio cholerae 01, biótipo cholerae",
		});
	});

	it("should return a subcategory written without the dot", () => {
		expect(getCid10("F322")).toEqual({
			code: "F322",
			description: "Episódio depressivo grave sem sintomas psicóticos",
		});
	});

	it("should return a category", () => {
		expect(getCid10("A00")).toEqual({ code: "A00", description: "Cólera" });
		expect(getCid10("F32")).toEqual({ code: "F32", description: "Episódios depressivos" });
	});

	it("should return a category that has no subcategory (I10)", () => {
		expect(getCid10("I10")).toEqual({
			code: "I10",
			description: "Hipertensão essencial (primária)",
		});
	});

	it("should return the first and the last code of the table", () => {
		expect(getCid10("A00")).toEqual({ code: "A00", description: "Cólera" });
		expect(getCid10("Z99.9")).toEqual({
			code: "Z999",
			description: "Dependência de máquina e aparelho capacitante não especificado",
		});
	});

	it("should keep the quotes and brackets a description carries", () => {
		expect(getCid10("F43.0")).toEqual({ code: "F430", description: 'Reação aguda ao "stress"' });
		expect(getCid10("Z76.5")).toEqual({
			code: "Z765",
			description: "Pessoa fingindo ser doente [simulação consciente]",
		});
	});

	it("should ignore the letter case and surrounding whitespace", () => {
		expect(getCid10(" m54.5 ")).toEqual({ code: "M545", description: "Dor lombar baixa" });
	});

	it("should return a fresh object that does not leak the internal table", () => {
		expect(getCid10("A000")).not.toBe(getCid10("A000"));
	});

	it("should return null for a subcategory its category does not have", () => {
		expect(getCid10("A00.5")).toBeNull();
		expect(getCid10("I10.0")).toBeNull();
	});

	it("should return null for a category the table does not have", () => {
		expect(getCid10("A10")).toBeNull();
		expect(getCid10("U07.1")).toBeNull();
	});

	it("should return null for a value that is not written in a documented form", () => {
		expect(getCid10("")).toBeNull();
		expect(getCid10("   ")).toBeNull();
		expect(getCid10("A00-0")).toBeNull();
		expect(getCid10("A00.00")).toBeNull();
		expect(getCid10("A00.0 Cólera")).toBeNull();
	});

	it("should return null for the keys of Object.prototype", () => {
		for (const key of PROTOTYPE_KEYS) {
			expect(getCid10(key)).toBeNull();
		}
	});

	it("should return null for a value that is not a string", () => {
		// @ts-expect-error not a string
		expect(getCid10(null)).toBeNull();
		// @ts-expect-error not a string
		expect(getCid10()).toBeNull();
		// @ts-expect-error not a string
		expect(getCid10(100)).toBeNull();
		// @ts-expect-error not a string
		expect(getCid10(["A00"])).toBeNull();
	});

	describe("properties", () => {
		const codeArbitrary = fc.constantFrom(...Object.keys(CID10_DESCRIPTIONS));

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getCid10, anyGarbage);
		});

		test("should resolve every known code, in either case, and agree with isValidCid10", () => {
			fc.assert(
				fc.property(codeArbitrary, (code) => {
					const expected = { code, description: CID10_DESCRIPTIONS[code] };

					expect(getCid10(code)).toEqual(expected);
					expect(getCid10(code.toLowerCase())).toEqual(expected);
					expect(isValidCid10(code)).toBe(true);
				}),
			);
		});

		test("should resolve every known subcategory with the dot", () => {
			fc.assert(
				fc.property(
					codeArbitrary.filter((code) => code.length === 4),
					(code) => {
						const masked = `${code.slice(0, 3)}.${code.slice(3)}`;

						expect(getCid10(masked)).toEqual({ code, description: CID10_DESCRIPTIONS[code] });
					},
				),
			);
		});

		test("should agree with isValidCid10 for any code shaped value", () => {
			fc.assert(
				fc.property(fc.stringMatching(/^[A-Z]\d{2}\.?\d?$/), (value) => {
					expect(getCid10(value) !== null).toBe(isValidCid10(value));
				}),
			);
		});
	});
});

describe("getCid10 types", () => {
	test("should take a string and return a Cid10 or null", () => {
		expectTypeOf(getCid10).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(getCid10).returns.toEqualTypeOf<Cid10 | null>();
		expectTypeOf<Cid10>().toEqualTypeOf<{ code: string; description: string }>();
	});
});
