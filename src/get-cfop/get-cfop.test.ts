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
			description:
				"Venda de mercadoria adquirida ou recebida de terceiros, ou qualquer venda de mercadoria efetuada pelo MEI com exceção das saídas classificadas nos códigos 5.501, 5.502, 5.504 e 5.505",
		});
	});

	it("should return the CFOP entry for a known code as a number", () => {
		expect(getCfop(5102)).toEqual({
			code: "5102",
			description:
				"Venda de mercadoria adquirida ou recebida de terceiros, ou qualquer venda de mercadoria efetuada pelo MEI com exceção das saídas classificadas nos códigos 5.501, 5.502, 5.504 e 5.505",
		});
	});

	it("should return the CFOP entry for a masked code (5.102)", () => {
		expect(getCfop("5.102")).toEqual({
			code: "5102",
			description:
				"Venda de mercadoria adquirida ou recebida de terceiros, ou qualquer venda de mercadoria efetuada pelo MEI com exceção das saídas classificadas nos códigos 5.501, 5.502, 5.504 e 5.505",
		});
	});

	it("should accept the whitespace around a code, one of the documented forms", () => {
		expect(getCfop(" 5102 ")?.code).toBe("5102");
		expect(getCfop("\t5.102\n")?.code).toBe("5102");
	});

	it("should return one entry per code even when the annex glues the body into the code line (1255 and 1256)", () => {
		expect(getCfop("1255")).toEqual({
			code: "1255",
			description:
				"Compra de energia elétrica por estabelecimento prestador de serviço de comunicação",
		});
		expect(getCfop("1256")).toEqual({
			code: "1256",
			description: "Compra de energia elétrica por estabelecimento de produtor rural",
		});
	});

	it("should resolve the codes the 2022 and 2024 rewrites of the annex added (7504, 6360, 2128 and 1934)", () => {
		expect(getCfop("7504")).toEqual({
			code: "7504",
			description: "Exportação de mercadoria que foi objeto de formação de lote de exportação",
		});
		expect(getCfop("6360")).toEqual({
			code: "6360",
			description:
				"Prestação de serviço de transporte a contribuinte substituto em relação ao serviço de transporte",
		});
		expect(getCfop("2128")).toEqual({
			code: "2128",
			description: "Compra para utilização na prestação de serviço sujeita ao ISSQN",
		});
		expect(getCfop("1934")).toEqual({
			code: "1934",
			description:
				"Entrada simbólica de mercadoria recebida para depósito em depósito fechado ou armazém geral",
		});
	});

	it("should carry the wording in force for the repurposed Sistema de Integração e Parceria Rural codes (1451 and 1452)", () => {
		expect(getCfop("1451")?.description).toBe(
			"Entrada de animal - Sistema de Integração e Parceria Rural",
		);
		expect(getCfop("1452")?.description).toBe(
			"Entrada de insumo - Sistema de Integração e Parceria Rural",
		);
	});

	it("should keep the annex punctuation intact (7211 quotes drawback, 1126 and 1128 are capitalised)", () => {
		expect(getCfop("7211")?.description).toBe(
			"Devolução de compras para industrialização sob o regime de “drawback”",
		);
		expect(getCfop("1126")?.description).toBe(
			"Compra para utilização na prestação de serviço sujeita ao ICMS",
		);
		expect(getCfop("1128")?.description).toBe(
			"Compra para utilização na prestação de serviço sujeita ao ISSQN",
		);
	});

	it("should keep only the wording in force for a re-worded code (7667, Ajuste SINIEF 39/25)", () => {
		expect(getCfop("7667")?.description).toBe(
			"Saída de combustíveis ou lubrificantes a consumidor ou usuário final",
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

	it("should return null for a group heading (a code ending in 00)", () => {
		expect(getCfop("1100")).toBeNull();
		expect(getCfop("5300")).toBeNull();
	});

	it("should return null for a subgroup heading (a code ending in 50)", () => {
		expect(getCfop("1150")).toBeNull();
		expect(getCfop("5350")).toBeNull();
	});

	it("should still resolve the operable codes a subgroup heading heads (1151 and 5351)", () => {
		expect(getCfop("1151")).toEqual({
			code: "1151",
			description: "Transferência para industrialização ou produção rural",
		});
		expect(getCfop("5351")).toEqual({
			code: "5351",
			description: "Prestação de serviço de transporte para execução de serviço da mesma natureza",
		});
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

	it("should return null for a string that is not a documented form", () => {
		expect(getCfop("abc5102")).toBeNull();
		expect(getCfop("5..102")).toBeNull();
	});

	it("should return null for a number that is not a non-negative safe integer", () => {
		expect(getCfop(-5102)).toBeNull();
		expect(getCfop(51.02)).toBeNull();
		expect(getCfop(2 ** 53)).toBeNull();
	});

	it("should return null for a null-prototype object", () => {
		expect(getCfop(Object.create(null))).toBeNull();
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
