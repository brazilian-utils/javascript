import * as fc from "fast-check";

import { NBS_DESCRIPTIONS } from "../_internals/constants/nbs";
import { anyGarbage, PROTOTYPE_KEYS } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatNbs } from "../format-nbs/format-nbs";
import { isValidNbs } from "../is-valid-nbs/is-valid-nbs";
import { getNbs, type Nbs } from "./get-nbs";

const RESIDENTIAL = {
	code: "101011100",
	description: "Serviços de construção de edificações residenciais de um e dois pavimentos",
};

describe("getNbs", () => {
	it("should return the code for the 9 digits without a mask", () => {
		expect(getNbs("101011100")).toEqual(RESIDENTIAL);
	});

	it("should return the code for the N.NNNN.NN.NN mask", () => {
		expect(getNbs("1.0101.11.00")).toEqual(RESIDENTIAL);
	});

	it("should return the code for a number", () => {
		expect(getNbs(101_011_100)).toEqual(RESIDENTIAL);
		expect(getNbs(126_050_000)).toEqual({ code: "126050000", description: "Serviços domésticos" });
	});

	it("should ignore surrounding whitespace", () => {
		expect(getNbs("  1.0101.11.00\n")).toEqual(RESIDENTIAL);
	});

	it("should accept any single mask character between the groups", () => {
		expect(getNbs("1 0101 11 00")).toEqual(RESIDENTIAL);
		expect(getNbs("1-0101-11-00")).toEqual(RESIDENTIAL);
		expect(getNbs("1/0101/11/00")).toEqual(RESIDENTIAL);
		expect(getNbs("1.010111.00")).toEqual(RESIDENTIAL);
	});

	it("should resolve the three codes of the NBS 2.0 the ANEXO B of the NFS-e leaves out", () => {
		expect(getNbs("1.0904.40.00")).toEqual({
			code: "109044000",
			description: "Serviços de retrocessão",
		});
		expect(getNbs("1.0402.29.00")?.code).toBe("104022900");
		expect(getNbs("1.0403.29.00")?.code).toBe("104032900");
	});

	it("should resolve the codes the Portaria 2.000/2018 renumbered and not the ones it replaced", () => {
		expect(getNbs("1.0402.11.10")?.code).toBe("104021110");
		expect(getNbs("1.0402.11.90")?.code).toBe("104021190");
		expect(getNbs("1.0402.11.11")).toBeNull();
		expect(getNbs("1.0402.11.19")).toBeNull();
	});

	it("should return a fresh object that does not leak the internal table", () => {
		expect(getNbs("101011100")).not.toBe(getNbs("101011100"));
	});

	it("should return null for the chapter, position and subposition headings", () => {
		expect(getNbs("1.01")).toBeNull();
		expect(getNbs("1.0101")).toBeNull();
		expect(getNbs("1.0101.1")).toBeNull();
		expect(getNbs("10101")).toBeNull();
	});

	it("should return null for a 9 digit code the table does not carry", () => {
		expect(getNbs("1.9999.99.99")).toBeNull();
		expect(getNbs("9.9999.99.99")).toBeNull();
		expect(getNbs("000000000")).toBeNull();
	});

	it("should return null for a group boundary written with more than one separator", () => {
		expect(getNbs("1..0101.11.00")).toBeNull();
		expect(getNbs("1.0101..11.00")).toBeNull();
		expect(getNbs("1.0101.11..00")).toBeNull();
	});

	it("should return null for a string that is not written in a documented form", () => {
		expect(getNbs("1.0101abc11.00")).toBeNull();
		expect(getNbs("10.101.11.00")).toBeNull();
		expect(getNbs("x101011100")).toBeNull();
		expect(getNbs("101011100x")).toBeNull();
		expect(getNbs("1010111000")).toBeNull();
		expect(getNbs("1,0101,11,00")).toBeNull();
	});

	it("should return null for an empty string and for whitespace only", () => {
		expect(getNbs("")).toBeNull();
		expect(getNbs("   ")).toBeNull();
	});

	it("should return null for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(getNbs(null)).toBeNull();
		// @ts-expect-error not a string or number
		expect(getNbs()).toBeNull();
	});

	it("should return null for a number that is not a non-negative safe integer", () => {
		expect(getNbs(-101_011_100)).toBeNull();
		expect(getNbs(101_011_100.5)).toBeNull();
		expect(getNbs(2 ** 53)).toBeNull();
	});

	it("should return null for the keys of Object.prototype", () => {
		for (const key of PROTOTYPE_KEYS) expect(getNbs(key)).toBeNull();
	});

	describe("properties", () => {
		const codeArbitrary = fc.constantFrom(...Object.keys(NBS_DESCRIPTIONS));

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getNbs, anyGarbage);
		});

		test("should resolve every known code, bare, masked or as a number, and agree with isValidNbs", () => {
			fc.assert(
				fc.property(codeArbitrary, (code) => {
					const expected = { code, description: NBS_DESCRIPTIONS[code] };

					expect(getNbs(code)).toEqual(expected);
					expect(getNbs(Number(code))).toEqual(expected);
					expect(getNbs(formatNbs(code))).toEqual(expected);
					expect(isValidNbs(code)).toBe(true);
				}),
			);
		});

		test("should only carry 9 digit codes starting with 1 and non-empty descriptions", () => {
			fc.assert(
				fc.property(codeArbitrary, (code) => {
					expect(code).toMatch(/^1\d{8}$/);
					expect(NBS_DESCRIPTIONS[code].trim()).not.toBe("");
				}),
			);
		});
	});
});

describe("getNbs types", () => {
	test("should take a string or number and return an Nbs or null", () => {
		expectTypeOf(getNbs).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getNbs).returns.toEqualTypeOf<Nbs | null>();
		expectTypeOf<Nbs>().toEqualTypeOf<{ code: string; description: string }>();
	});
});
