import * as fc from "fast-check";

import { crc16Ccitt } from "../_internals/crc16-ccitt/crc16-ccitt";
import { cpfs } from "../_internals/test/document-arbitraries";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { generateCpf } from "../generate-cpf/generate-cpf";
import { generatePixPayload } from "../generate-pix-payload/generate-pix-payload";
import {
	type PixPayloadInfo,
	type PixPointOfInitiation,
	getPixPayloadInfo,
} from "./get-pix-payload-info";

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

const KEY_MARKED_SINGLE_USE =
	"00020101021226330014br.gov.bcb.pix0111123456789095204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63043CAC";

const URL_WITH_STATIC_POINT_OF_INITIATION =
	"00020101021126480014br.gov.bcb.pix2526pix.example.com/qr/v2/12345204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304F299";

const URL_WITHOUT_POINT_OF_INITIATION =
	"00020126480014br.gov.bcb.pix2526pix.example.com/qr/v2/12345204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041420";

const STATIC_POINT_OF_INITIATION =
	"00020101021126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***630448CD";

const tlv = (id: string, value: string): string =>
	`${id}${value.length.toString().padStart(2, "0")}${value}`;

const hasValidCrc = (payload: string): boolean =>
	crc16Ccitt(payload.slice(0, -4)) === payload.slice(-4);

const buildPayload = (merchantAccountInformation: string, additionalData?: string): string => {
	const withoutCrc = [
		tlv("00", "01"),
		tlv("26", merchantAccountInformation),
		tlv("52", "0000"),
		tlv("53", "986"),
		tlv("58", "BR"),
		tlv("59", "Fulano de Tal"),
		tlv("60", "BRASILIA"),
		additionalData === undefined ? "" : tlv("62", additionalData),
		"6304",
	].join("");

	return withoutCrc + crc16Ccitt(withoutCrc);
};

const MERCHANT_ACCOUNT_INFORMATION = tlv("00", "br.gov.bcb.pix") + tlv("01", "12345678909");

const WITHDRAWAL_FACILITATOR_ISPB = "12345678";

const buildWithdrawalPayload = (fss: string, amount?: string): string => {
	const withoutCrc = [
		tlv("00", "01"),
		tlv("26", MERCHANT_ACCOUNT_INFORMATION + tlv("03", fss)),
		tlv("52", "0000"),
		tlv("53", "986"),
		amount === undefined ? "" : tlv("54", amount),
		tlv("58", "BR"),
		tlv("59", "Fulano de Tal"),
		tlv("60", "BRASILIA"),
		"6304",
	].join("");

	return withoutCrc + crc16Ccitt(withoutCrc);
};

const buildPayloadWithMerchantAccountInformationTag = (tag: string): string => {
	const withoutCrc = [
		tlv("00", "01"),
		tlv(tag, MERCHANT_ACCOUNT_INFORMATION),
		tlv("52", "0000"),
		tlv("53", "986"),
		tlv("58", "BR"),
		tlv("59", "Fulano de Tal"),
		tlv("60", "BRASILIA"),
		"6304",
	].join("");

	return withoutCrc + crc16Ccitt(withoutCrc);
};

const buildPayloadWithoutCountryCode = (): string => {
	const withoutCrc = [
		tlv("00", "01"),
		tlv("26", MERCHANT_ACCOUNT_INFORMATION),
		tlv("52", "0000"),
		tlv("53", "986"),
		tlv("59", "Fulano de Tal"),
		tlv("60", "BRASILIA"),
		"6304",
	].join("");

	return withoutCrc + crc16Ccitt(withoutCrc);
};

const buildPayloadBody = (merchantCity: string, crcTag: string): string =>
	tlv("00", "01") +
	tlv("26", MERCHANT_ACCOUNT_INFORMATION) +
	tlv("52", "0000") +
	tlv("53", "986") +
	tlv("58", "BR") +
	tlv("59", "Fulano de Tal") +
	tlv("60", merchantCity) +
	crcTag;

const buildPayloadWithCrcTag = (crcTag: string): string => {
	const withoutCrc = buildPayloadBody("BRASILIA", crcTag);

	return withoutCrc + crc16Ccitt(withoutCrc);
};

const buildPayloadWithAmount = (amount: string): string => {
	const withoutCrc = [
		tlv("00", "01"),
		tlv("26", MERCHANT_ACCOUNT_INFORMATION),
		tlv("52", "0000"),
		tlv("53", "986"),
		tlv("54", amount),
		tlv("58", "BR"),
		tlv("59", "Fulano de Tal"),
		tlv("60", "BRASILIA"),
		"6304",
	].join("");

	return withoutCrc + crc16Ccitt(withoutCrc);
};

const DYNAMIC_URL = "pix.example.com/qr/v2/1234";

const buildDynamicPayloadWithAmount = (amount: string): string => {
	const location = tlv("00", "br.gov.bcb.pix") + tlv("25", DYNAMIC_URL);
	const withoutCrc = `${tlv("00", "01")}${tlv("01", "12")}${tlv("26", location)}${tlv("52", "0000")}${tlv("53", "986")}${tlv("54", amount)}${tlv("58", "BR")}${tlv("59", "Fulano de Tal")}${tlv("60", "BRASILIA")}6304`;

	return withoutCrc + crc16Ccitt(withoutCrc);
};

const buildPayloadWithMerchantName = (merchantName: string): string => {
	const withoutCrc = [
		tlv("00", "01"),
		tlv("26", MERCHANT_ACCOUNT_INFORMATION),
		tlv("52", "0000"),
		tlv("53", "986"),
		tlv("58", "BR"),
		tlv("59", merchantName),
		tlv("60", "BRASILIA"),
		"6304",
	].join("");

	return withoutCrc + crc16Ccitt(withoutCrc);
};

const buildPayloadWithMerchantCity = (merchantCity: string): string => {
	const withoutCrc = buildPayloadBody(merchantCity, "6304");

	return withoutCrc + crc16Ccitt(withoutCrc);
};

describe("getPixPayloadInfo", () => {
	describe("should return null", () => {
		test("when it is an empty or blank string", () => {
			expect(getPixPayloadInfo("")).toBeNull();
			expect(getPixPayloadInfo("   ")).toBeNull();
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getPixPayloadInfo(null)).toBeNull();
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getPixPayloadInfo()).toBeNull();
		});

		test("when it is a number", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getPixPayloadInfo(20_250_101)).toBeNull();
		});

		test("when it is a boolean, an object or an array", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getPixPayloadInfo(true)).toBeNull();
			// @ts-expect-error: intentionally invalid input
			expect(getPixPayloadInfo({})).toBeNull();
			// @ts-expect-error: intentionally invalid input
			expect(getPixPayloadInfo([])).toBeNull();
		});

		test("when the CRC does not match", () => {
			expect(getPixPayloadInfo(BACEN_STATIC.replace(/1D3D$/, "1D3E"))).toBeNull();
		});

		test("when it is free text", () => {
			expect(getPixPayloadInfo("pix copia e cola")).toBeNull();
		});

		test("when the key object is present but empty", () => {
			const merchantAccountInformation = tlv("00", "br.gov.bcb.pix") + tlv("01", "");

			expect(getPixPayloadInfo(buildPayload(merchantAccountInformation))).toBeNull();
		});

		test("when the url object is present but empty", () => {
			const merchantAccountInformation = tlv("00", "br.gov.bcb.pix") + tlv("25", "");

			expect(getPixPayloadInfo(buildPayload(merchantAccountInformation))).toBeNull();
		});

		test("when the merchant account information carries both a key and a url", () => {
			expect(
				getPixPayloadInfo(
					"00020101021226500014br.gov.bcb.pix0107a@b.com2517pix.example.com/x5204000053039865802BR5901A6001B62070503***63049A4B",
				),
			).toBeNull();
		});

		test("when the url is not a PSP location (scheme, whitespace, host without a dot)", () => {
			expect(
				getPixPayloadInfo(
					"00020101021226470014br.gov.bcb.pix2525https://pix.example.com/x5204000053039865802BR5901A6001B62070503***6304F843",
				),
			).toBeNull();
			expect(
				getPixPayloadInfo(
					"00020101021226390014br.gov.bcb.pix2517pix example.com/x5204000053039865802BR5901A6001B62070503***6304C8E4",
				),
			).toBeNull();
			expect(
				getPixPayloadInfo(
					"00020101021226330014br.gov.bcb.pix2511localhost/x5204000053039865802BR5901A6001B62070503***630494D9",
				),
			).toBeNull();
		});

		test("when the fss of a Pix Saque is not the 8 digits of an ISPB", () => {
			expect(getPixPayloadInfo(buildWithdrawalPayload("1234567", "0.00"))).toBeNull();
			expect(getPixPayloadInfo(buildWithdrawalPayload("123456789", "0.00"))).toBeNull();
			expect(getPixPayloadInfo(buildWithdrawalPayload("1234567x", "0.00"))).toBeNull();
		});

		test("when the fss of a Pix Saque is written next to a PSP location", () => {
			const payload =
				"00020126600014br.gov.bcb.pix2526pix.example.com/qr/v2/12340308123456785204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304DA55";

			expect(hasValidCrc(payload)).toBe(true);
			expect(getPixPayloadInfo(payload)).toBeNull();
		});

		test("when the additional data template is malformed", () => {
			const merchantAccountInformation = tlv("00", "br.gov.bcb.pix") + tlv("01", "some-key");

			expect(getPixPayloadInfo(buildPayload(merchantAccountInformation, "9"))).toBeNull();
		});

		test("when a merchant account information template is malformed TLV, without throwing", () => {
			expect(getPixPayloadInfo(buildPayload("XY"))).toBeNull();
		});

		test("when a merchant account information template is well-formed but carries no GUI, without throwing", () => {
			const merchantAccountInformation = tlv("01", "12345678909");

			expect(getPixPayloadInfo(buildPayload(merchantAccountInformation))).toBeNull();
		});

		test("when the country code field is entirely absent, without throwing", () => {
			expect(getPixPayloadInfo(buildPayloadWithoutCountryCode())).toBeNull();
		});

		test("when the CRC tag id is not 6304, even with an otherwise self-consistent checksum", () => {
			expect(getPixPayloadInfo(buildPayloadWithCrcTag("9904"))).toBeNull();
		});

		test("when the transaction amount is longer than 13 characters", () => {
			expect(getPixPayloadInfo(buildPayloadWithAmount("99999999999.99"))).toBeNull();
		});

		test("when the transaction amount is not written as a plain decimal number", () => {
			expect(getPixPayloadInfo(buildPayloadWithAmount("+1.00"))).toBeNull();
			expect(getPixPayloadInfo(buildPayloadWithAmount(" 1.00"))).toBeNull();
			expect(getPixPayloadInfo(buildPayloadWithAmount("1.00x"))).toBeNull();
			expect(getPixPayloadInfo(buildPayloadWithAmount("abc"))).toBeNull();
		});

		test("when the transaction amount states more than two decimal places", () => {
			expect(getPixPayloadInfo(buildPayloadWithAmount("1.234"))).toBeNull();
		});

		test("when a key payload states a transaction amount of zero without the fss of a Pix Saque", () => {
			expect(hasValidCrc(buildPayloadWithAmount("0.00"))).toBe(true);
			expect(getPixPayloadInfo(buildPayloadWithAmount("0.00"))).toBeNull();
			expect(getPixPayloadInfo(buildPayloadWithAmount("0"))).toBeNull();
			expect(getPixPayloadInfo(buildPayloadWithAmount("0.0"))).toBeNull();
		});

		test("when the merchant name is present but empty", () => {
			expect(getPixPayloadInfo(buildPayloadWithMerchantName(""))).toBeNull();
		});

		test("when the merchant city is present but empty", () => {
			expect(getPixPayloadInfo(buildPayloadWithMerchantCity(""))).toBeNull();
		});
	});

	describe("should parse a static payload", () => {
		test("should ignore the transaction amount and the txid of a dynamic payload, which belong to the PSP location", () => {
			expect(
				getPixPayloadInfo(
					"00020101021226480014br.gov.bcb.pix2526pix.example.com/qr/v2/123452040000530398654041.005802BR5901A6001B62100506ABC1236304C7F9",
				),
			).toEqual({
				url: "pix.example.com/qr/v2/1234",
				merchantName: "A",
				merchantCity: "B",
				pointOfInitiation: "dynamic",
			});
		});

		test("should accept a transaction amount of zero in a dynamic payload, whose amount the PSP location settles", () => {
			expect(getPixPayloadInfo(buildDynamicPayloadWithAmount("0.00"))).toEqual({
				url: DYNAMIC_URL,
				merchantName: "Fulano de Tal",
				merchantCity: "BRASILIA",
				pointOfInitiation: "dynamic",
			});
		});

		test("from the static QR Code example in the Bacen 'Manual de Padrões para Iniciação do Pix', with no key of its own for a field the payload does not carry", () => {
			expect(getPixPayloadInfo(BACEN_STATIC)).toStrictEqual({
				key: "123e4567-e12b-12d1-a456-426655440000",
				merchantName: "Fulano de Tal",
				merchantCity: "BRASILIA",
				pointOfInitiation: "static",
			});
		});

		test("for a Pix Saque BR Code, reading back the fss (26-03) of §2.6 with a transaction amount of zero", () => {
			expect(
				getPixPayloadInfo(buildWithdrawalPayload(WITHDRAWAL_FACILITATOR_ISPB, "0.00")),
			).toEqual({
				key: "12345678909",
				withdrawalFacilitator: "12345678",
				merchantName: "Fulano de Tal",
				merchantCity: "BRASILIA",
				amount: 0,
				pointOfInitiation: "static",
			});
		});

		test("for a Pix Saque BR Code whose amount is written as the plain '0' of the BR Code field table", () => {
			expect(getPixPayloadInfo(buildWithdrawalPayload(WITHDRAWAL_FACILITATOR_ISPB, "0"))).toEqual({
				key: "12345678909",
				withdrawalFacilitator: "12345678",
				merchantName: "Fulano de Tal",
				merchantCity: "BRASILIA",
				amount: 0,
				pointOfInitiation: "static",
			});
		});

		test("for a Pix Saque BR Code that states no transaction amount at all", () => {
			expect(getPixPayloadInfo(buildWithdrawalPayload(WITHDRAWAL_FACILITATOR_ISPB))).toEqual({
				key: "12345678909",
				withdrawalFacilitator: "12345678",
				merchantName: "Fulano de Tal",
				merchantCity: "BRASILIA",
				pointOfInitiation: "static",
			});
		});

		test("marked single use by the point of initiation method 12, which the manual allows on any BR Code", () => {
			expect(hasValidCrc(KEY_MARKED_SINGLE_USE)).toBe(true);
			expect(getPixPayloadInfo(KEY_MARKED_SINGLE_USE)).toEqual({
				key: "12345678909",
				merchantName: "Fulano de Tal",
				merchantCity: "BRASILIA",
				pointOfInitiation: "dynamic",
			});
		});

		test("dropping the *** placeholder of an absent txid", () => {
			expect(getPixPayloadInfo(BACEN_STATIC)).not.toHaveProperty("txid");
		});

		test("with an amount and a txid, as in a widely published community example", () => {
			expect(getPixPayloadInfo(COMMUNITY_STATIC)).toEqual({
				key: "bee05743-4291-4f3c-9259-595df1307ba1",
				merchantName: "Alexandre Lima",
				merchantCity: "Presidente Prudente",
				amount: 10,
				txid: "Um-Id-Qualquer",
				pointOfInitiation: "static",
			});
		});

		test("picking the Pix arrangement out of the multi-arrangement payload from the 'Manual do BR Code' §2.2", () => {
			expect(getPixPayloadInfo(BRCODE_MANUAL)).toEqual({
				key: "123e4567-e12b-12d1-a456-426655440000",
				merchantName: "NOME DO RECEBEDOR",
				merchantCity: "BRASILIA",
				amount: 123.45,
				txid: "RP12345678-2019",
				pointOfInitiation: "static",
			});
		});

		test("when the merchant account information sits at the last valid id (51), not just at the usual 26", () => {
			expect(getPixPayloadInfo(buildPayloadWithMerchantAccountInformationTag("51"))).toEqual({
				key: "12345678909",
				merchantName: "Fulano de Tal",
				merchantCity: "BRASILIA",
				pointOfInitiation: "static",
			});
		});

		test("accepting a transaction amount whose length is exactly 13 characters", () => {
			expect(getPixPayloadInfo(buildPayloadWithAmount("9999999999.99"))?.amount).toBe(
				9_999_999_999.99,
			);
		});

		test("accepting a transaction amount written as a whole number, with no decimal point", () => {
			expect(getPixPayloadInfo(buildPayloadWithAmount("100"))?.amount).toBe(100);
		});

		test("without a key property when the payload is dynamic (carries a url instead)", () => {
			expect(getPixPayloadInfo(BACEN_DYNAMIC)).not.toHaveProperty("key");
		});

		test("without a url property when the payload is static (carries a key instead)", () => {
			expect(getPixPayloadInfo(BACEN_STATIC)).not.toHaveProperty("url");
		});

		test("without a txid property when the payload carries no additional data template at all", () => {
			expect(getPixPayloadInfo(buildPayload(MERCHANT_ACCOUNT_INFORMATION))).not.toHaveProperty(
				"txid",
			);
		});

		test("with a description", () => {
			const payload = generatePixPayload({
				key: "12345678909",
				merchantName: "Fulano de Tal",
				merchantCity: "Brasilia",
				description: "Pedido 42",
			});

			expect(getPixPayloadInfo(payload ?? "")).toEqual({
				key: "12345678909",
				description: "Pedido 42",
				merchantName: "Fulano de Tal",
				merchantCity: "Brasilia",
				pointOfInitiation: "static",
			});
		});
	});

	describe("should parse a dynamic payload", () => {
		test("from the dynamic QR Code example in the Bacen 'Manual de Padrões para Iniciação do Pix'", () => {
			expect(getPixPayloadInfo(BACEN_DYNAMIC)).toEqual({
				url: "pix.example.com/8b3da2f39a4140d1a91abd93113bd441",
				merchantName: "Fulano de Tal",
				merchantCity: "BRASILIA",
				pointOfInitiation: "dynamic",
			});
		});

		test("picking the Pix arrangement out of the composite QR Code example in the Bacen manual", () => {
			expect(getPixPayloadInfo(BACEN_COMPOSITE)).toEqual({
				url: "pix.example.com/8b3da2f39a4140d1a91abd93113bd441",
				merchantName: "Fulano de Tal",
				merchantCity: "BRASILIA",
				pointOfInitiation: "dynamic",
			});
		});

		test("reading the point of initiation method 11 as static, per the Bacen static example with it made explicit", () => {
			expect(getPixPayloadInfo(STATIC_POINT_OF_INITIATION)?.pointOfInitiation).toBe("static");
		});

		test("when it carries no point of initiation method at all, which the manual marks optional", () => {
			expect(hasValidCrc(URL_WITHOUT_POINT_OF_INITIATION)).toBe(true);
			expect(getPixPayloadInfo(URL_WITHOUT_POINT_OF_INITIATION)).toEqual({
				url: "pix.example.com/qr/v2/1234",
				merchantName: "Fulano de Tal",
				merchantCity: "BRASILIA",
				pointOfInitiation: "dynamic",
			});
		});

		test("when the point of initiation method is 11, since the PSP location is what makes it dynamic", () => {
			expect(hasValidCrc(URL_WITH_STATIC_POINT_OF_INITIATION)).toBe(true);
			expect(getPixPayloadInfo(URL_WITH_STATIC_POINT_OF_INITIATION)).toEqual({
				url: "pix.example.com/qr/v2/1234",
				merchantName: "Fulano de Tal",
				merchantCity: "BRASILIA",
				pointOfInitiation: "dynamic",
			});
		});
	});

	describe("should round-trip with generatePixPayload", () => {
		test("for a payload with every field", () => {
			const pix = {
				key: "12345678909",
				description: "Pedido 42",
				merchantName: "Fulano de Tal",
				merchantCity: "Brasilia",
				amount: 123.45,
				txid: "RP123456782019",
			};

			expect(getPixPayloadInfo(generatePixPayload(pix) ?? "")).toEqual({
				...pix,
				pointOfInitiation: "static",
			});
		});

		test("for randomized CPF keys", () => {
			for (let index = 0; index < 200; index++) {
				const pix = {
					key: generateCpf(),
					merchantName: "Fulano de Tal",
					merchantCity: "Brasilia",
					amount: Number(((index + 1) / 100).toFixed(2)),
					txid: `TX${index}`,
				};

				expect(getPixPayloadInfo(generatePixPayload(pix) ?? "")).toEqual({
					...pix,
					pointOfInitiation: "static",
				});
			}
		});
	});

	describe("properties", () => {
		const names = fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{0,24}$/);

		test("should read back every key a generated payload can carry", () => {
			fc.assert(
				fc.property(names, fc.uuid(), (merchantName, key) => {
					const payload = generatePixPayload({ key, merchantName, merchantCity: "BRASILIA" });
					const parsed = getPixPayloadInfo(payload ?? "");

					expect(parsed?.merchantName).toBe(merchantName);
					expect(parsed?.merchantCity).toBe("BRASILIA");
					expect(parsed?.key).toBe(key);
				}),
			);
		});

		test("should return null when the CRC does not match the payload", () => {
			fc.assert(
				fc.property(fc.gen(), names, fc.integer({ min: 0, max: 3 }), (g, merchantName, index) => {
					const key = g(cpfs);
					const payload = generatePixPayload({ key, merchantName, merchantCity: "BRASILIA" });
					const crc = (payload ?? "").slice(-4);
					const replacement = crc.charAt(index) === "0" ? "1" : "0";
					const broken = `${(payload ?? "").slice(0, -4)}${crc.slice(0, index)}${replacement}${crc.slice(index + 1)}`;

					expect(getPixPayloadInfo(broken)).toBeNull();
				}),
			);
		});

		test("should never throw and always return a BR Code or null", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					const parsed = getPixPayloadInfo(value as string);

					expect(parsed === null || typeof parsed.merchantName === "string").toBe(true);
				}),
			);
		});
	});
});

describe("getPixPayloadInfo types", () => {
	test("should take a string and return a Pix payload or null", () => {
		expectTypeOf(getPixPayloadInfo).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(getPixPayloadInfo).returns.toEqualTypeOf<PixPayloadInfo | null>();
	});

	test("should restrict the Pix payload shape and its point of initiation", () => {
		expectTypeOf<PixPayloadInfo>().toEqualTypeOf<{
			key?: string;
			url?: string;
			description?: string;
			withdrawalFacilitator?: string;
			merchantName: string;
			merchantCity: string;
			amount?: number;
			txid?: string;
			pointOfInitiation: PixPointOfInitiation;
		}>();
		expectTypeOf<PixPointOfInitiation>().toEqualTypeOf<"static" | "dynamic">();
	});
});
