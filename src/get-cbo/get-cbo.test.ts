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
			description: "Analista de desenvolvimento de sistemas",
		});
	});

	it("should return the occupation for a code with the hyphen mask", () => {
		expect(getCbo("2124-05")).toEqual({
			code: "212405",
			description: "Analista de desenvolvimento de sistemas",
		});
	});

	it("should return the occupation for a code given as a number", () => {
		expect(getCbo(212_405)).toEqual({
			code: "212405",
			description: "Analista de desenvolvimento de sistemas",
		});
	});

	it("should pad to six digits so codes starting with zero resolve (0102-05, Oficial da aeronáutica)", () => {
		const oficial = { code: "010205", description: "Oficial da aeronáutica" };

		expect(getCbo(10_205)).toEqual(oficial);
		expect(getCbo("10205")).toEqual(oficial);
		expect(getCbo("010205")).toEqual(oficial);
	});

	it("should pad a string of bare digits exactly like the number it spells", () => {
		expect(getCbo("10205")).toEqual(getCbo(10_205));
		expect(getCbo(" 10205 ")).toEqual(getCbo(10_205));
	});

	it("should not pad a masked value, which already carries its separators", () => {
		expect(getCbo("102-05")).toBeNull();
		expect(getCbo("0102-05")).toEqual({ code: "010205", description: "Oficial da aeronáutica" });
	});

	it("should resolve a code the official CSV carries and the community mirror did not (142135)", () => {
		expect(getCbo("142135")).toEqual({
			code: "142135",
			description: "Oficial de proteção de dados pessoais (dpo)",
		});
	});

	it("should return null for a code the official CSV no longer carries (223150)", () => {
		expect(getCbo("223150")).toBeNull();
	});

	it("should reject a group boundary written with more than one separator (2124--05)", () => {
		expect(getCbo("2124--05")).toBeNull();
		expect(getCbo("2124-05")).toEqual({
			code: "212405",
			description: "Analista de desenvolvimento de sistemas",
		});
		expect(getCbo("2124 05")).toEqual({
			code: "212405",
			description: "Analista de desenvolvimento de sistemas",
		});
	});

	it("should return a fresh object that does not leak the internal table", () => {
		const first = getCbo("212405");
		const second = getCbo("212405");
		expect(first).not.toBe(second);
	});

	it("should return null for an unknown six digit code", () => {
		expect(getCbo("000000")).toBeNull();
	});

	it("should return null for a padded short value no occupation carries and for a wider value", () => {
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

	it("should return null for a string that is not written in a documented form", () => {
		expect(getCbo("2124abc05")).toBeNull();
		expect(getCbo("21-2405")).toBeNull();
	});

	it("should return null for a number that is not a non-negative safe integer", () => {
		expect(getCbo(-212_405)).toBeNull();
		expect(getCbo(2124.05)).toBeNull();
		expect(getCbo(2 ** 53)).toBeNull();
	});

	describe("properties", () => {
		const codeArbitrary = fc.constantFrom(...Object.keys(CBO_TITLES));

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getCbo, anyGarbage);
		});

		test("should resolve every known code, as a string or a number, and agree with isValidCbo", () => {
			fc.assert(
				fc.property(codeArbitrary, (code) => {
					const expected = { code, description: CBO_TITLES[code] };
					const unpadded = String(Number(code));

					expect(getCbo(code)).toEqual(expected);
					expect(getCbo(Number(code))).toEqual(expected);
					expect(getCbo(unpadded)).toEqual(expected);
					expect(isValidCbo(code)).toBe(true);
				}),
			);
		});

		test("should resolve every known code with the hyphen mask", () => {
			fc.assert(
				fc.property(codeArbitrary, (code) => {
					const masked = `${code.slice(0, 4)}-${code.slice(4)}`;

					expect(getCbo(masked)).toEqual({ code, description: CBO_TITLES[code] });
				}),
			);
		});
	});
});

describe("getCbo types", () => {
	test("should take a string or number and return a Cbo or null", () => {
		expectTypeOf(getCbo).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getCbo).returns.toEqualTypeOf<Cbo | null>();
		expectTypeOf<Cbo>().toEqualTypeOf<{ code: string; description: string }>();
	});
});
