import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { generateCpf } from "../generate-cpf/generate-cpf";
import { generatePixPayload } from "../generate-pix-payload/generate-pix-payload";
import { isValidPixPayload } from "./is-valid-pix-payload";

const BACEN_STATIC =
	"00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D";

const BACEN_DYNAMIC =
	"00020101021226700014br.gov.bcb.pix2548pix.example.com/8b3da2f39a4140d1a91abd93113bd4415204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***630464E4";

const BACEN_COMPOSITE =
	"00020101021226700014br.gov.bcb.pix2548pix.example.com/8b3da2f39a4140d1a91abd93113bd4415204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***80740014br.gov.bcb.pix2552pix.example.com/rec/2353c790eefb11eaadc10242ac1200026304FB42";

const BRCODE_MANUAL =
	"00020104141234567890123426580014BR.GOV.BCB.PIX0136123e4567-e12b-12d1-a456-42665544000027300012BR.COM.OUTRO011001234567895204000053039865406123.455802BR5917NOME DO RECEBEDOR6008BRASILIA61087007490062190515RP12345678-201980390012BR.COM.OUTRO01190123.ABCD.3456.WXYZ6304AD38";

const COMMUNITY_STATIC =
	"00020126580014br.gov.bcb.pix0136bee05743-4291-4f3c-9259-595df1307ba1520400005303986540510.005802BR5914Alexandre Lima6019Presidente Prudente62180514Um-Id-Qualquer6304D475";

describe("isValidPixPayload", () => {
	describe("should return true", () => {
		test("for the static QR Code example in the Bacen 'Manual de Padrões para Iniciação do Pix'", () => {
			expect(isValidPixPayload(BACEN_STATIC)).toBe(true);
		});

		test("for the dynamic QR Code example in the Bacen 'Manual de Padrões para Iniciação do Pix'", () => {
			expect(isValidPixPayload(BACEN_DYNAMIC)).toBe(true);
		});

		test("for the composite QR Code example in the Bacen 'Manual de Padrões para Iniciação do Pix'", () => {
			expect(isValidPixPayload(BACEN_COMPOSITE)).toBe(true);
		});

		test("for the multi-arrangement payload from the 'Manual do BR Code' §2.2", () => {
			expect(isValidPixPayload(BRCODE_MANUAL)).toBe(true);
		});

		test("for a widely published community payload with an amount and a txid", () => {
			expect(isValidPixPayload(COMMUNITY_STATIC)).toBe(true);
		});

		test("when the payload is surrounded by whitespace", () => {
			expect(isValidPixPayload(`  ${BACEN_STATIC}\n`)).toBe(true);
		});

		test("when the CRC is written in lowercase", () => {
			expect(isValidPixPayload(BACEN_STATIC.replace(/1D3D$/, "1d3d"))).toBe(true);
		});

		test("when the additional data template is absent", () => {
			expect(
				isValidPixPayload(
					"00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA6304740C",
				),
			).toBe(true);
		});
	});

	describe("should return false", () => {
		test("when it is an empty or blank string", () => {
			expect(isValidPixPayload("")).toBe(false);
			expect(isValidPixPayload("   ")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPixPayload(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPixPayload()).toBe(false);
		});

		test("when it is a number", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPixPayload(20_250_101)).toBe(false);
		});

		test("when it is a boolean, an object or an array", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPixPayload(true)).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidPixPayload({})).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidPixPayload([])).toBe(false);
		});

		test("when the CRC does not match", () => {
			expect(isValidPixPayload(BACEN_STATIC.replace(/1D3D$/, "1D3E"))).toBe(false);
		});

		test("when the CRC is not hexadecimal", () => {
			expect(isValidPixPayload(BACEN_STATIC.replace(/1D3D$/, "ZZZZ"))).toBe(false);
		});

		test("when the payload does not end with the CRC object", () => {
			expect(isValidPixPayload(BACEN_STATIC.slice(0, -8))).toBe(false);
		});

		test("when the TLV structure is malformed", () => {
			expect(isValidPixPayload("00020126990014br.gov.bcb.pix6304BEFF")).toBe(false);
			expect(isValidPixPayload("000X016304EAB2")).toBe(false);
		});

		test("when the payload format indicator is not 01", () => {
			expect(
				isValidPixPayload(
					"00020226580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304BAA3",
				),
			).toBe(false);
		});

		test("when the point of initiation method is neither 11 nor 12", () => {
			expect(
				isValidPixPayload(
					"00020101021326580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63047DC6",
				),
			).toBe(false);
		});

		test("when the currency is not 986", () => {
			expect(
				isValidPixPayload(
					"00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053038405802BR5913Fulano de Tal6008BRASILIA62070503***63040C88",
				),
			).toBe(false);
		});

		test("when the country code is not BR", () => {
			expect(
				isValidPixPayload(
					"00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802AR5913Fulano de Tal6008BRASILIA62070503***6304F417",
				),
			).toBe(false);
		});

		test("when the merchant category code is missing", () => {
			expect(
				isValidPixPayload(
					"00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-42665544000053039865802BR5913Fulano de Tal6008BRASILIA62070503***630405E3",
				),
			).toBe(false);
		});

		test("when the merchant name is missing", () => {
			expect(
				isValidPixPayload(
					"00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR6008BRASILIA62070503***630452B8",
				),
			).toBe(false);
		});

		test("when the merchant city is missing", () => {
			expect(
				isValidPixPayload(
					"00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal62070503***63047718",
				),
			).toBe(false);
		});

		test("when the GUI is not br.gov.bcb.pix", () => {
			expect(
				isValidPixPayload(
					"00020126560012br.com.outro0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63045803",
				),
			).toBe(false);
		});

		test("when the merchant account information holds neither a key nor a URL", () => {
			expect(
				isValidPixPayload(
					"00020126180014br.gov.bcb.pix5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304A335",
				),
			).toBe(false);
		});

		test("when the amount is not a number", () => {
			expect(
				isValidPixPayload(
					"00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-42665544000052040000530398654061R3.455802BR5913Fulano de Tal6008BRASILIA62070503***63049FEF",
				),
			).toBe(false);
		});

		test("when it is a boleto or free text", () => {
			expect(isValidPixPayload("10491443385511900000200000000141325230000093423")).toBe(false);
			expect(isValidPixPayload("pix copia e cola")).toBe(false);
		});
	});

	describe("properties", () => {
		const names = fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{0,24}$/);

		const cities = fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{0,14}$/);

		test("should accept every generated payload", () => {
			fc.assert(
				fc.property(names, cities, (merchantName, merchantCity) => {
					const key = generateCpf();
					const payload = generatePixPayload({ key, merchantName, merchantCity });

					expect(isValidPixPayload(payload ?? "")).toBe(true);
					expect(isValidPixPayload(`  ${payload}\n`)).toBe(true);
				}),
			);
		});

		test("should reject a payload whose text was changed", () => {
			fc.assert(
				fc.property(names, fc.nat(), (merchantName, offset) => {
					const key = generateCpf();
					const payload = generatePixPayload({ key, merchantName, merchantCity: "BRASILIA" });
					const text = payload ?? "";
					const index = offset % (text.length - 4);
					const replacement = text.charAt(index) === "0" ? "1" : "0";
					const changed = `${text.slice(0, index)}${replacement}${text.slice(index + 1)}`;

					expect(isValidPixPayload(changed)).toBe(false);
				}),
			);
		});

		test("should never throw and always judge a BR Code with a boolean", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					expect(typeof isValidPixPayload(value as string)).toBe("boolean");
				}),
			);
		});
	});
});

describe("isValidPixPayload types", () => {
	test("should take a string and return a boolean", () => {
		expectTypeOf(isValidPixPayload).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(isValidPixPayload).returns.toEqualTypeOf<boolean>();
	});
});
