import * as fc from "fast-check";

import { crc16Ccitt } from "../_internals/crc16-ccitt/crc16-ccitt";
import { cpfs } from "../_internals/test/arbitraries";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { generatePixPayload } from "../generate-pix-payload/generate-pix-payload";
import { isValidPixPayload } from "./is-valid-pix-payload";

const BACEN_STATIC =
	"00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D";

const BACEN_DYNAMIC =
	"00020101021226700014br.gov.bcb.pix2548pix.example.com/8b3da2f39a4140d1a91abd93113bd4415204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***630464E4";

const BACEN_COMPOSITE =
	"00020101021226700014br.gov.bcb.pix2548pix.example.com/8b3da2f39a4140d1a91abd93113bd4415204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***80740014br.gov.bcb.pix2552pix.example.com/rec/2353c790eefb11eaadc10242ac1200026304FB42";

const BACEN_COMPOSITE_STATIC =
	"00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865406100.505802BR5913Fulano de Tal6008BRASILIA62070503***80740014br.gov.bcb.pix2552pix.example.com/rec/2353c790eefb11eaadc10242ac12000263042875";

const BRCODE_MANUAL_AS_PUBLISHED =
	"00020104141234567890123426580014BR.GOV.BCB.PIX0136123e4567-e12b-12d1-a456-42665544000027300012BR.COM.OUTRO011001234567895204000053039865406123.455802BR5917NOME DO RECEBEDOR6008BRASILIA61087007490062190515RP12345678-201980390012BR.COM.OUTRO01190123.ABCD.3456.WXYZ6304AD38";

const COMMUNITY_STATIC_AS_PUBLISHED =
	"00020126580014br.gov.bcb.pix0136bee05743-4291-4f3c-9259-595df1307ba1520400005303986540510.005802BR5914Alexandre Lima6019Presidente Prudente62180514Um-Id-Qualquer6304D475";

const STATIC_BODY = BACEN_STATIC.slice(0, -8);

const A25 = "A".repeat(25);

const A26 = "A".repeat(26);

const withCrc = (body: string): string => {
	const withoutCrc = `${body}6304`;

	return withoutCrc + crc16Ccitt(withoutCrc);
};

const tlv = (id: string, value: string): string =>
	`${id}${value.length.toString().padStart(2, "0")}${value}`;

const withNewCrc = (payload: string): string => withCrc(payload.slice(0, -8));

// The published payloads with the "-" dropped from the txid (§2.6.2 allows letters and digits
// only) and, for the community one, the city cut to the 15 characters of object 60.
const BRCODE_MANUAL = withNewCrc(
	BRCODE_MANUAL_AS_PUBLISHED.replace("62190515RP12345678-2019", "62180514RP123456782019"),
);

const COMMUNITY_STATIC = withNewCrc(
	COMMUNITY_STATIC_AS_PUBLISHED.replace(
		"6019Presidente Prudente62180514Um-Id-Qualquer",
		"6010Presidente62160512UmIdQualquer",
	),
);

const buildBody = (merchantAccountInformation: string, rest: string): string =>
	tlv("00", "01") + tlv("26", tlv("00", "br.gov.bcb.pix") + merchantAccountInformation) + rest;

const COMMON_OBJECTS = "5204000053039865802BR5913Fulano de Tal6008BRASILIA";

const withKey = (key: string): string =>
	withCrc(buildBody(tlv("01", key), `${COMMON_OBJECTS}62070503***`));

const withUrl = (url: string): string =>
	withCrc(buildBody(tlv("25", url), `${COMMON_OBJECTS}62070503***`));

const withAdditionalData = (additionalData: string): string =>
	withCrc(buildBody(tlv("01", "12345678909"), COMMON_OBJECTS + tlv("62", additionalData)));

const withTxid = (txid: string): string => withAdditionalData(tlv("05", txid));

const withMerchant = (name: string, city: string): string =>
	withCrc(
		buildBody(
			tlv("01", "12345678909"),
			`5204000053039865802BR${tlv("59", name)}${tlv("60", city)}62070503***`,
		),
	);

const withAmount = (amount: string): string =>
	withCrc(
		STATIC_BODY.replace(
			"5303986",
			`530398654${amount.length.toString().padStart(2, "0")}${amount}`,
		),
	);

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

		test("for the multi-arrangement payload from the 'Manual do BR Code' §2.2, with a txid the Pix manual allows", () => {
			expect(isValidPixPayload(BRCODE_MANUAL)).toBe(true);
		});

		test("for a widely published community payload with an amount and a txid, brought within the Pix manual", () => {
			expect(isValidPixPayload(COMMUNITY_STATIC)).toBe(true);
		});

		test("for the composite QR Code example of §2.8.2, a key with an amount and a recurrence location", () => {
			expect(isValidPixPayload(BACEN_COMPOSITE_STATIC)).toBe(true);
		});

		test("for a key in each DICT form", () => {
			for (const key of [
				"12345678909",
				"00038166000105",
				"12ABC34501DE35",
				"+5561912345678",
				"fulano_da_silva.recebedor@example.com",
				"a{b}@example.com",
				"123e4567-e12b-12d1-a456-426655440000",
			]) {
				expect(isValidPixPayload(withKey(key))).toBe(true);
			}
		});

		test("when the payload is surrounded by whitespace", () => {
			expect(isValidPixPayload(`  ${BACEN_STATIC}\n`)).toBe(true);
		});

		test("when the CRC is written in lowercase", () => {
			expect(isValidPixPayload(BACEN_STATIC.replace(/1D3D$/, "1d3d"))).toBe(true);
		});

		test("when a key payload marks itself single use with the point of initiation method 12", () => {
			expect(
				isValidPixPayload(
					"00020101021226330014br.gov.bcb.pix0111123456789095204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63043CAC",
				),
			).toBe(true);
		});

		test("when a url payload carries the point of initiation method 11, which the manual leaves optional", () => {
			expect(
				isValidPixPayload(
					"00020101021126480014br.gov.bcb.pix2526pix.example.com/qr/v2/12345204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304F299",
				),
			).toBe(true);
		});

		test("when a url payload carries no point of initiation method at all", () => {
			expect(
				isValidPixPayload(
					"00020126480014br.gov.bcb.pix2526pix.example.com/qr/v2/12345204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041420",
				),
			).toBe(true);
		});

		test("for a Pix Saque BR Code, whose fss (26-03) goes with the amount of the withdrawal", () => {
			expect(
				isValidPixPayload(
					withCrc(
						"00020126700014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000030812345678520400005303986540550.005802BR5913Fulano de Tal6008BRASILIA62070503***",
					),
				),
			).toBe(true);
		});

		test("for a Pix Saque BR Code with a transaction amount of zero, the 0.00 the Pix API has a saque state", () => {
			expect(
				isValidPixPayload(
					"00020126700014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-42665544000003081234567852040000530398654040.005802BR5913Fulano de Tal6008BRASILIA62070503***63043A07",
				),
			).toBe(true);
		});

		test("for a dynamic payload with a transaction amount of zero, which the payer ignores", () => {
			expect(
				isValidPixPayload(
					withCrc(
						"00020126480014br.gov.bcb.pix2526pix.example.com/qr/v2/123452040000530398654040.005802BR5913Fulano de Tal6008BRASILIA62070503***",
					),
				),
			).toBe(true);
		});

		test("when the amount carries the decimal mark with no decimals, as the EMV examples allow", () => {
			expect(isValidPixPayload(withAmount("98."))).toBe(true);
			expect(isValidPixPayload(withAmount("98"))).toBe(true);
			expect(isValidPixPayload(withAmount("98.7"))).toBe(true);
			expect(isValidPixPayload(withAmount("98.73"))).toBe(true);
			expect(isValidPixPayload(withAmount("0.01"))).toBe(true);
		});
	});

	test("should accept a payload with a PSP location whose 62-05 is filled, since §2.7 has the payer ignore it", () => {
		expect(isValidPixPayload(BACEN_DYNAMIC)).toBe(true);

		for (const txid of ["ABC123", "7978c0c97ea847e78e8849634473c1f1", "RP12345678-2019"]) {
			const field = `05${String(txid.length).padStart(2, "0")}${txid}`;
			const body = BACEN_DYNAMIC.slice(0, -8).replace(
				"62070503***",
				`62${String(field.length).padStart(2, "0")}${field}`,
			);

			expect(isValidPixPayload(withCrc(body))).toBe(true);
		}
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

		test("when the last 8 characters only look like a CRC object inside another object", () => {
			const crafted =
				"00020126360014br.gov.bcb.pix0114+55119876543215204000053039865802BR5906Fulano6008BRASILIA62130509A6304872F";

			expect(isValidPixPayload(crafted)).toBe(false);
		});

		test("when an object ID appears twice, even with a CRC that matches", () => {
			expect(isValidPixPayload(withCrc(`${STATIC_BODY}5903abc`))).toBe(false);
			expect(isValidPixPayload(withCrc(`${STATIC_BODY}5913Fulano de Tal`))).toBe(false);
			expect(isValidPixPayload(withCrc(`${STATIC_BODY}6304AAAA`))).toBe(false);
		});

		test("when the TLV structure is malformed", () => {
			expect(isValidPixPayload("00020126990014br.gov.bcb.pix6304BEFF")).toBe(false);
			expect(isValidPixPayload("000X016304EAB2")).toBe(false);
		});

		test("when an object declares the length 00, below the 01 to 99 of the EMV specification", () => {
			expect(isValidPixPayload(withCrc(STATIC_BODY))).toBe(true);
			expect(isValidPixPayload(withCrc(`${STATIC_BODY}6100`))).toBe(false);
			const emptyTxid = STATIC_BODY.replace("62070503***", "62040500");

			expect(isValidPixPayload(withCrc(emptyTxid))).toBe(false);
		});

		test("when the payload format indicator is not 01", () => {
			expect(
				isValidPixPayload(
					"00020226580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304BAA3",
				),
			).toBe(false);
		});

		test("when the payload format indicator is not the first object", () => {
			const rest = STATIC_BODY.slice("000201".length);

			expect(isValidPixPayload(withCrc(`000201${rest}`))).toBe(true);
			const afterMerchantAccountInformation = `${rest.slice(0, 62)}000201${rest.slice(62)}`;

			expect(isValidPixPayload(withCrc(afterMerchantAccountInformation))).toBe(false);
			expect(isValidPixPayload(withCrc(`${rest}000201`))).toBe(false);
		});

		test("when the payload format indicator is repeated later with another value", () => {
			expect(isValidPixPayload(withCrc(`${STATIC_BODY}000202`))).toBe(false);
		});

		test("when the point of initiation method is neither 11 nor 12", () => {
			expect(
				isValidPixPayload(
					"00020101021326580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63047DC6",
				),
			).toBe(false);
		});

		test("when a key payload states a transaction amount of zero", () => {
			expect(
				isValidPixPayload(
					"00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-42665544000052040000530398654040.005802BR5913Fulano de Tal6008BRASILIA62070503***63042451",
				),
			).toBe(false);
			expect(isValidPixPayload(withAmount("0"))).toBe(false);
			expect(isValidPixPayload(withAmount("0."))).toBe(false);
			expect(isValidPixPayload(withAmount("00.00"))).toBe(false);
		});

		test("when the amount is not digits with at most one decimal mark and two decimals", () => {
			expect(isValidPixPayload(withAmount(".5"))).toBe(false);
			expect(isValidPixPayload(withAmount("98.."))).toBe(false);
			expect(isValidPixPayload(withAmount("9.8.7"))).toBe(false);
			expect(isValidPixPayload(withAmount("98.735"))).toBe(false);
			expect(isValidPixPayload(withAmount("98,73"))).toBe(false);
			expect(isValidPixPayload(withAmount("3 705"))).toBe(false);
			expect(isValidPixPayload(withAmount("x98"))).toBe(false);
		});

		test("when the amount is longer than 13 characters", () => {
			expect(isValidPixPayload(withAmount("9999999999.99"))).toBe(true);
			expect(isValidPixPayload(withAmount("99999999999.9"))).toBe(true);
			expect(isValidPixPayload(withAmount("99999999999.99"))).toBe(false);
		});

		test("when the fss of a Pix Saque is not the 8 digits of an ISPB", () => {
			expect(
				isValidPixPayload(
					withCrc(
						"00020126690014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400000307123456752040000530398654050.005802BR5913Fulano de Tal6008BRASILIA62070503***",
					),
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

		test("when the merchant category code is not 4 digits", () => {
			const withCode = (code: string): string =>
				withCrc(
					STATIC_BODY.replace("52040000", `52${code.length.toString().padStart(2, "0")}${code}`),
				);

			expect(isValidPixPayload(withCode("0000"))).toBe(true);
			expect(isValidPixPayload(withCode("5812"))).toBe(true);
			expect(isValidPixPayload(withCode("abcd"))).toBe(false);
			expect(isValidPixPayload(withCode("58a2"))).toBe(false);
			expect(isValidPixPayload(withCode("581"))).toBe(false);
			expect(isValidPixPayload(withCode("58123"))).toBe(false);
			expect(isValidPixPayload(withCode("x5812"))).toBe(false);
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

		test("when the additional data template is absent, although the manual has 62-05 always present", () => {
			expect(
				isValidPixPayload(
					"00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA6304740C",
				),
			).toBe(false);
		});

		test("when the additional data template carries no txid (62-05)", () => {
			expect(isValidPixPayload(withAdditionalData("0103***"))).toBe(false);
		});

		test("when the txid is neither *** nor 1 to 25 letters and digits (§2.6.2)", () => {
			expect(isValidPixPayload(withTxid(A25))).toBe(true);
			expect(isValidPixPayload(withTxid("abcXYZ019"))).toBe(true);
			expect(isValidPixPayload(withTxid(A26))).toBe(false);
			expect(isValidPixPayload(withTxid("RP12345678-2019"))).toBe(false);
			expect(isValidPixPayload(withTxid("Um Id"))).toBe(false);
			expect(isValidPixPayload(withTxid("pedido_42"))).toBe(false);
			expect(isValidPixPayload(withTxid("**"))).toBe(false);
		});

		test("when the payloads are taken as published, with a txid and a city the Pix manual does not allow", () => {
			expect(isValidPixPayload(BRCODE_MANUAL_AS_PUBLISHED)).toBe(false);
			expect(isValidPixPayload(COMMUNITY_STATIC_AS_PUBLISHED)).toBe(false);
		});

		test("when the key is not written in the DICT form (§2.5.1)", () => {
			for (const key of [
				"123.456.789-09",
				"11987654321",
				"(61) 91234-5678",
				"Fulano@Example.com",
				"123E4567-E12B-12D1-A456-426655440000",
				"12345678900",
				"some-key",
				" 12345678909",
			]) {
				expect(isValidPixPayload(withKey(key))).toBe(false);
			}
		});

		test("when the PSP location is longer than 77 characters (§2.5.2)", () => {
			const url77 = `pix.example.com/${"a".repeat(61)}`;

			expect(url77).toHaveLength(77);
			expect(isValidPixPayload(withUrl(url77))).toBe(true);
			expect(isValidPixPayload(withUrl(`${url77}a`))).toBe(false);
		});

		test("when the merchant name is longer than 25 characters", () => {
			expect(isValidPixPayload(withMerchant(A25, "BRASILIA"))).toBe(true);
			expect(isValidPixPayload(withMerchant(A26, "BRASILIA"))).toBe(false);
		});

		test("when the merchant city is longer than 15 characters", () => {
			expect(isValidPixPayload(withMerchant("Fulano de Tal", "Presidente Prud"))).toBe(true);
			expect(isValidPixPayload(withMerchant("Fulano de Tal", "Presidente Prudente"))).toBe(false);
		});

		test("when the country code is not the uppercase BR of ISO 3166-1", () => {
			const lowercase = STATIC_BODY.replace("5802BR", "5802br");
			const mixedCase = STATIC_BODY.replace("5802BR", "5802Br");

			expect(isValidPixPayload(withCrc(lowercase))).toBe(false);
			expect(isValidPixPayload(withCrc(mixedCase))).toBe(false);
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
				fc.property(fc.gen(), names, cities, (g, merchantName, merchantCity) => {
					const key = g(cpfs);
					const payload = generatePixPayload({ key, merchantName, merchantCity });

					expect(isValidPixPayload(payload ?? "")).toBe(true);
					expect(isValidPixPayload(`  ${payload}\n`)).toBe(true);
				}),
			);
		});

		test("should reject a payload whose text was changed", () => {
			fc.assert(
				fc.property(fc.gen(), names, fc.nat(), (g, merchantName, offset) => {
					const key = g(cpfs);
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
