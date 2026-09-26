import * as fc from "fast-check";

import { CEST_CODES } from "../_internals/constants/cest";
import { CEST_DESCRIPTIONS, CEST_SEGMENTS } from "../_internals/constants/cest-descriptions";
import { anyGarbage, digitsUpTo, PROTOTYPE_KEYS } from "../_internals/test/arbitraries";
import { lookupTable } from "../_internals/test/lookup-table";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isValidCest } from "../is-valid-cest/is-valid-cest";
import { getCest, type Cest } from "./get-cest";

const CEST_TABLE = lookupTable(CEST_CODES, 7, CEST_DESCRIPTIONS);

describe("getCest", () => {
	it("should return the entry for a known code written as 7 digits", () => {
		expect(getCest("0500100")).toEqual({
			code: "0500100",
			description: "Cimento",
			segment: "Cimentos",
		});
	});

	it("should return the entry for a code in the NN.NNN.NN form the annexes print", () => {
		expect(getCest("01.001.00")).toEqual({
			code: "0100100",
			description:
				"Catalisadores em colmeia cerâmica ou metálica para conversão catalítica de gases de escape de veículos e outros catalisadores",
			segment: "Autopeças",
		});
	});

	it("should left pad a bare code to 7 digits, as a number or as a string", () => {
		expect(getCest(500_100)?.code).toBe("0500100");
		expect(getCest("500100")?.code).toBe("0500100");
		expect(getCest(2_899_900)?.code).toBe("2899900");
	});

	it("should not pad a masked code", () => {
		expect(getCest("5.001.00")).toBeNull();
	});

	it("should accept any single documented separator and the whitespace around a code", () => {
		expect(getCest(" 05.001.00 ")?.code).toBe("0500100");
		expect(getCest("\t05 001-00\n")?.code).toBe("0500100");
		expect(getCest("05/00100")?.code).toBe("0500100");
	});

	it("should name the segment by its code, not by its item number in Anexo I (segments 16 and 28)", () => {
		expect(getCest("16.001.00")?.segment).toBe(
			"Pneumáticos, câmaras de ar e protetores de borracha",
		);
		expect(getCest("28.999.00")).toEqual({
			code: "2899900",
			description:
				"Outros produtos comercializados pelo sistema de marketing direto porta-a-porta a consumidor final não relacionados em outros itens deste anexo",
			segment: "Venda de mercadorias pelo sistema porta a porta",
		});
	});

	it("should keep only the wording in force of a re-worded item (17.024.00, Convênio ICMS 108/22)", () => {
		expect(getCest("17.024.00")?.description).toBe(
			"Queijos, exceto os dos CEST 17.024.01, 17.024.02, 17.024.03, 17.024.04 e 17.024.05",
		);
		expect(getCest("17.002.01")?.description).toBe(
			"Chocolates, em tabletes, barras ou paus, recheados, em recipientes ou embalagens de conteúdo superior a 1 kg e inferior ou igual a 2 kg",
		);
	});

	it("should keep the annex punctuation, without the trailing one (09.004.00 and 13.009.00)", () => {
		expect(getCest("09.004.00")?.description).toBe("“Starter”");
		expect(getCest("13.009.00")?.description).toBe(
			"Vacinas e produtos semelhantes, exceto para uso veterinário - positiva",
		);
	});

	it("should return null for a revoked item (03.001.00, 17.049.08 and 20.035.01)", () => {
		expect(getCest("03.001.00")).toBeNull();
		expect(getCest("17.049.08")).toBeNull();
		expect(getCest("20.035.01")).toBeNull();
	});

	it("should return null for an unknown code and for a segment that does not exist (15 and 18)", () => {
		expect(getCest("0000000")).toBeNull();
		expect(getCest("15.001.00")).toBeNull();
		expect(getCest("18.001.00")).toBeNull();
	});

	it("should return a fresh object on every call", () => {
		expect(getCest("0500100")).not.toBe(getCest("0500100"));
	});

	it("should return null for a code longer than 7 digits", () => {
		expect(getCest("05001000")).toBeNull();
		expect(getCest(50_010_000)).toBeNull();
	});

	it("should return null for a string that is not a documented form", () => {
		expect(getCest("")).toBeNull();
		expect(getCest("abc0500100")).toBeNull();
		expect(getCest("05..001.00")).toBeNull();
		expect(getCest("050.01.00")).toBeNull();
	});

	it("should return null for a number that is not a non-negative safe integer", () => {
		expect(getCest(-500_100)).toBeNull();
		expect(getCest(50_010.5)).toBeNull();
		expect(getCest(2 ** 53)).toBeNull();
	});

	it("should return null for values that are not a string or a number", () => {
		// @ts-expect-error not a string or number
		expect(getCest(null)).toBeNull();
		// @ts-expect-error not a string or number
		expect(getCest()).toBeNull();
		expect(getCest(Object.create(null))).toBeNull();
	});

	it("should return null for the keys of Object.prototype", () => {
		for (const key of PROTOTYPE_KEYS) {
			expect(getCest(key)).toBeNull();
		}
	});

	describe("properties", () => {
		const codeArbitrary = fc.constantFrom(...Object.keys(CEST_TABLE));

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getCest, anyGarbage);
		});

		test("should resolve every known code, bare, masked or as a number, and agree with isValidCest", () => {
			fc.assert(
				fc.property(codeArbitrary, (code) => {
					const masked = `${code.slice(0, 2)}.${code.slice(2, 5)}.${code.slice(5)}`;
					const expected = {
						code,
						description: CEST_TABLE[code],
						segment: CEST_SEGMENTS[code.slice(0, 2)],
					};

					expect(getCest(code)).toEqual(expected);
					expect(getCest(masked)).toEqual(expected);
					expect(getCest(Number(code))).toEqual(expected);
					expect(typeof expected.segment).toBe("string");
					expect(isValidCest(code)).toBe(true);
				}),
			);
		});

		test("should return null exactly when isValidCest returns false", () => {
			const valueArbitrary = fc.oneof(
				codeArbitrary,
				codeArbitrary.map((code) => `${code.slice(0, 2)}.${code.slice(2, 5)}.${code.slice(5)}`),
				codeArbitrary.map(Number),
				digitsUpTo(9),
				fc.nat(),
				fc.constantFrom(...PROTOTYPE_KEYS),
				anyGarbage,
				fc.anything(),
			);

			fc.assert(
				fc.property(valueArbitrary, (value) => {
					expect(getCest(value as string) === null).toBe(!isValidCest(value as string));
				}),
			);
		});
	});
});

describe("getCest types", () => {
	test("should take a string or number and return a Cest or null", () => {
		expectTypeOf(getCest).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getCest).returns.toEqualTypeOf<Cest | null>();
		expectTypeOf<Cest>().toEqualTypeOf<{ code: string; description: string; segment: string }>();
	});
});
