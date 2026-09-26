import * as fc from "fast-check";

import { CNAE_CODES } from "../_internals/constants/cnae";
import { CNAE_DESCRIPTIONS } from "../_internals/constants/cnae-descriptions";
import { anyGarbage, digitsUpTo } from "../_internals/test/arbitraries";
import { lookupTable } from "../_internals/test/lookup-table";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatCnae } from "../format-cnae/format-cnae";
import { isValidCnae } from "../is-valid-cnae/is-valid-cnae";
import { getCnae, type Cnae } from "./get-cnae";

const CNAE_SUBCLASSES = lookupTable(CNAE_CODES, 7, CNAE_DESCRIPTIONS);

describe("getCnae", () => {
	it("should return the CNAE entry for a known code as a string", () => {
		expect(getCnae("6201501")).toEqual({
			code: "6201501",
			description: "DESENVOLVIMENTO DE PROGRAMAS DE COMPUTADOR SOB ENCOMENDA",
		});
	});

	it("should return the CNAE entry for a known code as a number", () => {
		expect(getCnae(6_201_501)).toEqual({
			code: "6201501",
			description: "DESENVOLVIMENTO DE PROGRAMAS DE COMPUTADOR SOB ENCOMENDA",
		});
	});

	it("should return the CNAE entry for a masked code", () => {
		expect(getCnae("6201-5/01")).toEqual({
			code: "6201501",
			description: "DESENVOLVIMENTO DE PROGRAMAS DE COMPUTADOR SOB ENCOMENDA",
		});
	});

	it("should pad to seven digits so codes starting with zero resolve (0111-3/01, cultivo de arroz)", () => {
		const arroz = { code: "0111301", description: "CULTIVO DE ARROZ" };

		expect(getCnae(111_301)).toEqual(arroz);
		expect(getCnae("111301")).toEqual(arroz);
		expect(getCnae("0111301")).toEqual(arroz);
	});

	it("should pad a string of bare digits exactly like the number it spells", () => {
		expect(getCnae("111301")).toEqual(getCnae(111_301));
		expect(getCnae(" 111301 ")).toEqual(getCnae(111_301));
	});

	it("should not pad a masked value, which already carries its separators", () => {
		expect(getCnae("111-3/01")).toBeNull();
		expect(getCnae("0111-3/01")).toEqual({ code: "0111301", description: "CULTIVO DE ARROZ" });
	});

	it("should return the bare digits as the code and leave the mask to formatCnae", () => {
		expect(getCnae("6201-5/01")?.code).toBe("6201501");
		expect(formatCnae(getCnae("6201-5/01")?.code ?? "")).toBe("6201-5/01");
	});

	it("should return a fresh object on every call", () => {
		const first = getCnae("6201501");
		const second = getCnae("6201501");
		expect(first).not.toBe(second);
	});

	it("should return null for an unknown seven digit code", () => {
		expect(getCnae("0000000")).toBeNull();
	});

	it("should return null for a padded short value no subclass carries", () => {
		expect(getCnae("620150")).toBeNull();
	});

	it("should return null for an empty string", () => {
		expect(getCnae("")).toBeNull();
	});

	it("should return null for a string that is not written in a documented form", () => {
		expect(getCnae("0111abc301")).toBeNull();
		expect(getCnae("62-01501")).toBeNull();
	});

	it("should return null for a number that is not a non-negative safe integer", () => {
		expect(getCnae(-111_301)).toBeNull();
		expect(getCnae(6201.501)).toBeNull();
		expect(getCnae(2 ** 53)).toBeNull();
	});

	it("should return null for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(getCnae(null)).toBeNull();
		// @ts-expect-error not a string or number
		expect(getCnae()).toBeNull();
	});

	describe("properties", () => {
		const codeArbitrary = fc.constantFrom(...Object.keys(CNAE_SUBCLASSES));

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getCnae, anyGarbage);
		});

		const lookupInputs = fc.oneof(
			codeArbitrary,
			codeArbitrary.map((code) => `${code.slice(0, 4)}-${code[4]}/${code.slice(5)}`),
			fc.nat({ max: 9_999_999 }),
			digitsUpTo(9),
			anyGarbage,
			fc.anything(),
		);

		test("should return null exactly when isValidCnae is false", () => {
			fc.assert(
				fc.property(lookupInputs, (value) => {
					expect(getCnae(value as string) === null).toBe(!isValidCnae(value as string));
				}),
			);
		});

		test("should resolve every known code, as a string or a number, and agree with formatCnae and isValidCnae", () => {
			fc.assert(
				fc.property(codeArbitrary, (code) => {
					const expected = { code, description: CNAE_SUBCLASSES[code] };
					const unpadded = String(Number(code));

					expect(getCnae(code)).toEqual(expected);
					expect(getCnae(Number(code))).toEqual(expected);
					expect(getCnae(unpadded)).toEqual(expected);
					expect(formatCnae(getCnae(code)?.code ?? "")).toBe(formatCnae(code));
					expect(isValidCnae(code)).toBe(true);
				}),
			);
		});
	});
});

describe("getCnae types", () => {
	test("should take a string or number and return a Cnae or null", () => {
		expectTypeOf(getCnae).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getCnae).returns.toEqualTypeOf<Cnae | null>();
		expectTypeOf<Cnae>().toEqualTypeOf<{ code: string; description: string }>();
	});
});
