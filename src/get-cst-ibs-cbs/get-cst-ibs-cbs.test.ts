import * as fc from "fast-check";

import { CST_IBS_CBS_TABLE } from "../_internals/constants/ibs-cbs";
import { anyGarbage, digitsUpTo } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isValidCstIbsCbs } from "../is-valid-cst-ibs-cbs/is-valid-cst-ibs-cbs";
import { getCstIbsCbs, type CstIbsCbs } from "./get-cst-ibs-cbs";

describe("getCstIbsCbs", () => {
	it("should return the entry of a known code", () => {
		expect(getCstIbsCbs("000")).toEqual({ code: "000", description: "Tributação integral" });
		expect(getCstIbsCbs("410")).toEqual({
			code: "410",
			description: "Imunidade e não incidência",
		});
		expect(getCstIbsCbs(620)).toEqual({ code: "620", description: "Tributação monofásica" });
	});

	it("should take the description from the CST sheet, not the per classification wording of the cClassTrib sheet", () => {
		expect(getCstIbsCbs("200")?.description).toBe("Alíquota reduzida");
		expect(getCstIbsCbs("011")?.description).toBe("Tributação com alíquotas uniformes reduzidas");
	});

	it("should carry the wording Informe Técnico 2025.002 v.1.40 gave CST 820", () => {
		expect(getCstIbsCbs("820")?.description).toBe("Tributação em documento específico");
	});

	it("should carry the codes later versions of the table added (222, 515 and 811)", () => {
		expect(getCstIbsCbs("222")?.description).toBe("Redução de base de cálculo");
		expect(getCstIbsCbs("515")?.description).toBe("Diferimento com redução de alíquota");
		expect(getCstIbsCbs("811")?.description).toBe("Ajustes");
	});

	it("should pad a value with leading zeros, as a number or as a string", () => {
		const expected = { code: "010", description: "Tributação com alíquotas uniformes" };

		expect(getCstIbsCbs(10)).toEqual(expected);
		expect(getCstIbsCbs("10")).toEqual(expected);
		expect(getCstIbsCbs(" 010 ")).toEqual(expected);
		expect(getCstIbsCbs(0)?.code).toBe("000");
	});

	it("should return a fresh object on every call", () => {
		expect(getCstIbsCbs("000")).not.toBe(getCstIbsCbs("000"));
	});

	it("should return null for a code the table does not carry", () => {
		expect(getCstIbsCbs("100")).toBeNull();
		expect(getCstIbsCbs("060")).toBeNull();
		expect(getCstIbsCbs("0000")).toBeNull();
		expect(getCstIbsCbs("200001")).toBeNull();
	});

	it("should return null for a string that is not bare digits", () => {
		expect(getCstIbsCbs("cst200")).toBeNull();
		expect(getCstIbsCbs("2-00")).toBeNull();
		expect(getCstIbsCbs("")).toBeNull();
		expect(getCstIbsCbs("__proto__")).toBeNull();
	});

	it("should return null for a number that is not a non-negative safe integer", () => {
		expect(getCstIbsCbs(-200)).toBeNull();
		expect(getCstIbsCbs(20.5)).toBeNull();
		expect(getCstIbsCbs(2 ** 53)).toBeNull();
	});

	it("should return null for a value that is not a string or a number", () => {
		// @ts-expect-error not a string or number
		expect(getCstIbsCbs(null)).toBeNull();
		// @ts-expect-error not a string or number
		expect(getCstIbsCbs()).toBeNull();
		expect(getCstIbsCbs(Object.create(null))).toBeNull();
	});

	describe("properties", () => {
		const codeArbitrary = fc.constantFrom(...Object.keys(CST_IBS_CBS_TABLE));
		const anyValue = fc.oneof(
			codeArbitrary,
			fc.integer({ min: 0, max: 1200 }),
			digitsUpTo(4),
			fc.anything(),
			anyGarbage,
		);

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getCstIbsCbs, anyGarbage);
		});

		test("should resolve a value exactly when isValidCstIbsCbs accepts it", () => {
			fc.assert(
				fc.property(anyValue, (value) => {
					const input = value as string;

					expect(getCstIbsCbs(input) !== null).toBe(isValidCstIbsCbs(input));
				}),
			);
		});

		test("should hand every code of the table back under its own code", () => {
			fc.assert(
				fc.property(codeArbitrary, (code) => {
					expect(getCstIbsCbs(code)?.code).toBe(code);
				}),
			);
		});
	});
});

describe("getCstIbsCbs types", () => {
	test("should take a string or number and return a CstIbsCbs or null", () => {
		expectTypeOf(getCstIbsCbs).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getCstIbsCbs).returns.toEqualTypeOf<CstIbsCbs | null>();
		expectTypeOf<CstIbsCbs>().toEqualTypeOf<{ code: string; description: string }>();
	});
});
