import * as fc from "fast-check";

import { CFOP_TABLE } from "../_internals/constants/cfop";
import { anyGarbage } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { isValidCfop } from "../is-valid-cfop/is-valid-cfop";
import { getCfop, type Cfop } from "./get-cfop";

describe("getCfop", () => {
	it("should return the CFOP entry for a known code as a string", () => {
		expect(getCfop("5102")).toEqual({
			code: "5102",
			description: "Venda de mercadoria adquirida ou recebida de terceiros",
		});
	});

	it("should return the CFOP entry for a known code as a number", () => {
		expect(getCfop(5102)).toEqual({
			code: "5102",
			description: "Venda de mercadoria adquirida ou recebida de terceiros",
		});
	});

	it("should return the CFOP entry for a masked code (5.102)", () => {
		expect(getCfop("5.102")).toEqual({
			code: "5102",
			description: "Venda de mercadoria adquirida ou recebida de terceiros",
		});
	});

	it("should return the entries the mirror glues into the previous row (1306, 1414 and 6913)", () => {
		expect(getCfop("1306")).toEqual({
			code: "1306",
			description: "Aquisição de serviço de comunicação por estabelecimento de produtor rural",
		});
		expect(getCfop("1414")).toEqual({
			code: "1414",
			description:
				"Retorno de produção do estabelecimento, remetida para venda fora do estabelecimento em operação com produto sujeito ao regime de substituição tributária",
		});
		expect(getCfop("6913")).toEqual({
			code: "6913",
			description: "Retorno de mercadoria ou bem recebido para demonstração",
		});
	});

	it("should not carry the next entry inside a description (1305 ends before 1.306)", () => {
		expect(getCfop("1305")?.description).toBe(
			"Aquisição de serviço de comunicação por estabelecimento de geradora ou de distribuidora de energia elétrica",
		);
	});

	it("should return a fresh object on every call", () => {
		const first = getCfop("5102");
		const second = getCfop("5102");
		expect(first).not.toBe(second);
	});

	it("should return null for an unknown 4 digit code", () => {
		expect(getCfop("0000")).toBeNull();
	});

	it("should return null for a code with a length different from 4", () => {
		expect(getCfop("510")).toBeNull();
	});

	it("should return null for an empty string", () => {
		expect(getCfop("")).toBeNull();
	});

	it("should return null for null", () => {
		// @ts-expect-error not a string or number
		expect(getCfop(null)).toBeNull();
	});

	it("should return null for undefined", () => {
		// @ts-expect-error not a string or number
		expect(getCfop()).toBeNull();
	});

	describe("properties", () => {
		const codeArbitrary = fc.constantFrom(...Object.keys(CFOP_TABLE));

		test("should never throw, regardless of the input", () => {
			expectNeverThrows(getCfop, anyGarbage);
		});

		test("should resolve every known code, as a string or a number, and agree with isValidCfop", () => {
			fc.assert(
				fc.property(codeArbitrary, (code) => {
					const expected = { code, description: CFOP_TABLE[code] };

					expect(getCfop(code)).toEqual(expected);
					expect(getCfop(Number(code))).toEqual(expected);
					expect(isValidCfop(code)).toBe(true);
				}),
			);
		});
	});
});

describe("getCfop types", () => {
	test("should take a string or number and return a Cfop or null", () => {
		expectTypeOf(getCfop).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getCfop).returns.toEqualTypeOf<Cfop | null>();
		expectTypeOf<Cfop>().toEqualTypeOf<{ code: string; description: string }>();
	});
});
