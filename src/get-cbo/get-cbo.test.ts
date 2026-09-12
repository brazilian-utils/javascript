import * as fc from "fast-check";

import { CBO_TITLES } from "../_internals/constants/cbo";
import { anyGarbage } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isValidCbo } from "../is-valid-cbo/is-valid-cbo";
import { getCbo, type Cbo } from "./get-cbo";

describe("getCbo", () => {
	it("should return the occupation for a code without a mask", () => {
		expect(getCbo("212405")).toEqual({
			code: "212405",
			title: "Analista de desenvolvimento de sistemas",
		});
	});

	it("should return the occupation for a code with the hyphen mask", () => {
		expect(getCbo("2124-05")).toEqual({
			code: "212405",
			title: "Analista de desenvolvimento de sistemas",
		});
	});

	it("should return the occupation for a code given as a number", () => {
		expect(getCbo(212_405)).toEqual({
			code: "212405",
			title: "Analista de desenvolvimento de sistemas",
		});
	});

	it("should pad a number to six digits so codes starting with zero resolve (0102-05, Oficial da Aeronáutica)", () => {
		expect(getCbo(10_205)).toEqual({ code: "010205", title: "Oficial da Aeronáutica" });
		expect(getCbo("10205")).toBeNull();
	});

	it("should return a fresh object that does not leak the internal table", () => {
		const first = getCbo("212405");
		const second = getCbo("212405");
		expect(first).not.toBe(second);
	});

	it("should return null for an unknown six digit code", () => {
		expect(getCbo("000000")).toBeNull();
	});

	it("should return null when the digit count is not six", () => {
		expect(getCbo("21240")).toBeNull();
		expect(getCbo("2124055")).toBeNull();
	});

	it("should return null for an empty string", () => {
		expect(getCbo("")).toBeNull();
	});

	it("should return null for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(getCbo(null)).toBeNull();
		// @ts-expect-error not a string or number
		expect(getCbo()).toBeNull();
	});

	it("should return null for whitespace only", () => {
		expect(getCbo("      ")).toBeNull();
	});

	describe("properties", () => {
		const codeArbitrary = fc.constantFrom(...Object.keys(CBO_TITLES));

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getCbo, anyGarbage);
		});

		test("should resolve every known code, as a string or a number, and agree with isValidCbo", () => {
			fc.assert(
				fc.property(codeArbitrary, (code) => {
					expect(getCbo(code)).toEqual({ code, title: CBO_TITLES[code] });
					expect(getCbo(Number(code))).toEqual({ code, title: CBO_TITLES[code] });
					expect(isValidCbo(code)).toBe(true);
				}),
			);
		});

		test("should resolve every known code with the hyphen mask", () => {
			fc.assert(
				fc.property(codeArbitrary, (code) => {
					const masked = `${code.slice(0, 4)}-${code.slice(4)}`;

					expect(getCbo(masked)).toEqual({ code, title: CBO_TITLES[code] });
				}),
			);
		});
	});
});

describe("getCbo types", () => {
	test("should take a string or number and return a Cbo or null", () => {
		expectTypeOf(getCbo).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getCbo).returns.toEqualTypeOf<Cbo | null>();
		expectTypeOf<Cbo>().toEqualTypeOf<{ code: string; title: string }>();
	});
});
