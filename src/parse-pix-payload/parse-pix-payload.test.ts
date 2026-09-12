import { crc16Ccitt } from "../_internals/crc16-ccitt/crc16-ccitt";
import { describe, expect, test } from "../_internals/test/runtime";
import { generateCpf } from "../generate-cpf/generate-cpf";
import { generatePixPayload } from "../generate-pix-payload/generate-pix-payload";
import { parsePixPayload } from "./parse-pix-payload";

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

const STATIC_POINT_OF_INITIATION =
	"00020101021126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***630448CD";

const tlv = (id: string, value: string): string =>
	`${id}${value.length.toString().padStart(2, "0")}${value}`;

const buildPayload = (merchantAccountInformation: string, additionalData?: string): string => {
	const withoutCrc =
		tlv("00", "01") +
		tlv("26", merchantAccountInformation) +
		tlv("52", "0000") +
		tlv("53", "986") +
		tlv("58", "BR") +
		tlv("59", "Fulano de Tal") +
		tlv("60", "BRASILIA") +
		(additionalData !== undefined ? tlv("62", additionalData) : "") +
		"6304";

	return withoutCrc + crc16Ccitt(withoutCrc);
};

const MERCHANT_ACCOUNT_INFORMATION = tlv("00", "br.gov.bcb.pix") + tlv("01", "12345678909");

const buildPayloadWithMerchantAccountInformationTag = (tag: string): string => {
	const withoutCrc =
		tlv("00", "01") +
		tlv(tag, MERCHANT_ACCOUNT_INFORMATION) +
		tlv("52", "0000") +
		tlv("53", "986") +
		tlv("58", "BR") +
		tlv("59", "Fulano de Tal") +
		tlv("60", "BRASILIA") +
		"6304";

	return withoutCrc + crc16Ccitt(withoutCrc);
};

const buildPayloadWithoutCountryCode = (): string => {
	const withoutCrc =
		tlv("00", "01") +
		tlv("26", MERCHANT_ACCOUNT_INFORMATION) +
		tlv("52", "0000") +
		tlv("53", "986") +
		tlv("59", "Fulano de Tal") +
		tlv("60", "BRASILIA") +
		"6304";

	return withoutCrc + crc16Ccitt(withoutCrc);
};

const buildPayloadWithCrcTag = (crcTag: string): string => {
	const withoutCrc =
		tlv("00", "01") +
		tlv("26", MERCHANT_ACCOUNT_INFORMATION) +
		tlv("52", "0000") +
		tlv("53", "986") +
		tlv("58", "BR") +
		tlv("59", "Fulano de Tal") +
		tlv("60", "BRASILIA") +
		crcTag;

	return withoutCrc + crc16Ccitt(withoutCrc);
};

const buildPayloadWithAmount = (amount: string): string => {
	const withoutCrc =
		tlv("00", "01") +
		tlv("26", MERCHANT_ACCOUNT_INFORMATION) +
		tlv("52", "0000") +
		tlv("53", "986") +
		tlv("54", amount) +
		tlv("58", "BR") +
		tlv("59", "Fulano de Tal") +
		tlv("60", "BRASILIA") +
		"6304";

	return withoutCrc + crc16Ccitt(withoutCrc);
};

describe("parsePixPayload", () => {
	describe("should return null", () => {
		test("when it is an empty or blank string", () => {
			expect(parsePixPayload("")).toBeNull();
			expect(parsePixPayload("   ")).toBeNull();
		});

		test("when it is null", () => {
			// @ts-expect-error
			expect(parsePixPayload(null)).toBeNull();
		});

		test("when it is undefined", () => {
			// @ts-expect-error
			expect(parsePixPayload(undefined)).toBeNull();
		});

		test("when it is a number", () => {
			// @ts-expect-error
			expect(parsePixPayload(20250101)).toBeNull();
		});

		test("when it is a boolean, an object or an array", () => {
			// @ts-expect-error
			expect(parsePixPayload(true)).toBeNull();
			// @ts-expect-error
			expect(parsePixPayload({})).toBeNull();
			// @ts-expect-error
			expect(parsePixPayload([])).toBeNull();
		});

		test("when the CRC does not match", () => {
			expect(parsePixPayload(BACEN_STATIC.replace(/1D3D$/, "1D3E"))).toBeNull();
		});

		test("when it is free text", () => {
			expect(parsePixPayload("pix copia e cola")).toBeNull();
		});

		test("when the key object is present but empty", () => {
			const merchantAccountInformation = tlv("00", "br.gov.bcb.pix") + tlv("01", "");

			expect(parsePixPayload(buildPayload(merchantAccountInformation))).toBeNull();
		});

		test("when the url object is present but empty", () => {
			const merchantAccountInformation = tlv("00", "br.gov.bcb.pix") + tlv("25", "");

			expect(parsePixPayload(buildPayload(merchantAccountInformation))).toBeNull();
		});

		test("when the merchant account information carries both a key and a url", () => {
			expect(
				parsePixPayload(
					"00020101021226500014br.gov.bcb.pix0107a@b.com2517pix.example.com/x5204000053039865802BR5901A6001B62070503***63049A4B",
				),
			).toBeNull();
		});

		test("when the url is not a PSP location (scheme, whitespace, host without a dot)", () => {
			expect(
				parsePixPayload(
					"00020101021226470014br.gov.bcb.pix2525https://pix.example.com/x5204000053039865802BR5901A6001B62070503***6304F843",
				),
			).toBeNull();
			expect(
				parsePixPayload(
					"00020101021226390014br.gov.bcb.pix2517pix example.com/x5204000053039865802BR5901A6001B62070503***6304C8E4",
				),
			).toBeNull();
			expect(
				parsePixPayload(
					"00020101021226330014br.gov.bcb.pix2511localhost/x5204000053039865802BR5901A6001B62070503***630494D9",
				),
			).toBeNull();
		});

		test("when the additional data template is malformed", () => {
			const merchantAccountInformation = tlv("00", "br.gov.bcb.pix") + tlv("01", "some-key");

			expect(parsePixPayload(buildPayload(merchantAccountInformation, "9"))).toBeNull();
		});

		test("when a merchant account information template is malformed TLV, without throwing", () => {
			expect(parsePixPayload(buildPayload("XY"))).toBeNull();
		});

		test("when a merchant account information template is well-formed but carries no GUI, without throwing", () => {
			expect(parsePixPayload(buildPayload(tlv("01", "12345678909")))).toBeNull();
		});

		test("when the country code field is entirely absent, without throwing", () => {
			expect(parsePixPayload(buildPayloadWithoutCountryCode())).toBeNull();
		});

		test("when the CRC tag id is not 6304, even with an otherwise self-consistent checksum", () => {
			expect(parsePixPayload(buildPayloadWithCrcTag("9904"))).toBeNull();
		});

		test("when the transaction amount is longer than 13 characters", () => {
			expect(parsePixPayload(buildPayloadWithAmount("99999999999.99"))).toBeNull();
		});
	});

	describe("should parse a static payload", () => {
		test("should ignore the transaction amount and the txid of a dynamic payload, which belong to the PSP location", () => {
			expect(
				parsePixPayload(
					"00020101021226480014br.gov.bcb.pix2526pix.example.com/qr/v2/123452040000530398654041.005802BR5901A6001B62100506ABC1236304C7F9",
				),
			).toEqual({
				url: "pix.example.com/qr/v2/1234",
				merchantName: "A",
				merchantCity: "B",
				pointOfInitiation: "dynamic",
			});
		});

		test("from the static QR Code example in the Bacen 'Manual de Padrões para Iniciação do Pix'", () => {
			expect(parsePixPayload(BACEN_STATIC)).toEqual({
				key: "123e4567-e12b-12d1-a456-426655440000",
				merchantName: "Fulano de Tal",
				merchantCity: "BRASILIA",
			});
		});

		test("dropping the *** placeholder of an absent txid", () => {
			expect(parsePixPayload(BACEN_STATIC)).not.toHaveProperty("txid");
		});

		test("with an amount and a txid, as in a widely published community example", () => {
			expect(parsePixPayload(COMMUNITY_STATIC)).toEqual({
				key: "bee05743-4291-4f3c-9259-595df1307ba1",
				merchantName: "Alexandre Lima",
				merchantCity: "Presidente Prudente",
				amount: 10,
				txid: "Um-Id-Qualquer",
			});
		});

		test("picking the Pix arrangement out of the multi-arrangement payload from the 'Manual do BR Code' §2.2", () => {
			expect(parsePixPayload(BRCODE_MANUAL)).toEqual({
				key: "123e4567-e12b-12d1-a456-426655440000",
				merchantName: "NOME DO RECEBEDOR",
				merchantCity: "BRASILIA",
				amount: 123.45,
				txid: "RP12345678-2019",
			});
		});

		test("when the merchant account information sits at the last valid id (51), not just at the usual 26", () => {
			expect(parsePixPayload(buildPayloadWithMerchantAccountInformationTag("51"))).toEqual({
				key: "12345678909",
				merchantName: "Fulano de Tal",
				merchantCity: "BRASILIA",
			});
		});

		test("accepting a transaction amount whose length is exactly 13 characters", () => {
			expect(parsePixPayload(buildPayloadWithAmount("9999999999.99"))?.amount).toBe(9999999999.99);
		});

		test("accepting a transaction amount written as a whole number, with no decimal point", () => {
			expect(parsePixPayload(buildPayloadWithAmount("100"))?.amount).toBe(100);
		});

		test("without a key property when the payload is dynamic (carries a url instead)", () => {
			expect(parsePixPayload(BACEN_DYNAMIC)).not.toHaveProperty("key");
		});

		test("without a url property when the payload is static (carries a key instead)", () => {
			expect(parsePixPayload(BACEN_STATIC)).not.toHaveProperty("url");
		});

		test("without a txid property when the payload carries no additional data template at all", () => {
			expect(parsePixPayload(buildPayload(MERCHANT_ACCOUNT_INFORMATION))).not.toHaveProperty(
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

			expect(parsePixPayload(payload ?? "")).toEqual({
				key: "12345678909",
				description: "Pedido 42",
				merchantName: "Fulano de Tal",
				merchantCity: "Brasilia",
			});
		});
	});

	describe("should parse a dynamic payload", () => {
		test("from the dynamic QR Code example in the Bacen 'Manual de Padrões para Iniciação do Pix'", () => {
			expect(parsePixPayload(BACEN_DYNAMIC)).toEqual({
				url: "pix.example.com/8b3da2f39a4140d1a91abd93113bd441",
				merchantName: "Fulano de Tal",
				merchantCity: "BRASILIA",
				pointOfInitiation: "dynamic",
			});
		});

		test("picking the Pix arrangement out of the composite QR Code example in the Bacen manual", () => {
			expect(parsePixPayload(BACEN_COMPOSITE)).toEqual({
				url: "pix.example.com/8b3da2f39a4140d1a91abd93113bd441",
				merchantName: "Fulano de Tal",
				merchantCity: "BRASILIA",
				pointOfInitiation: "dynamic",
			});
		});

		test("reading the point of initiation method 11 as static, per the Bacen static example with it made explicit", () => {
			expect(parsePixPayload(STATIC_POINT_OF_INITIATION)?.pointOfInitiation).toBe("static");
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

			expect(parsePixPayload(generatePixPayload(pix) ?? "")).toEqual(pix);
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

				expect(parsePixPayload(generatePixPayload(pix) ?? "")).toEqual(pix);
			}
		});
	});
});
