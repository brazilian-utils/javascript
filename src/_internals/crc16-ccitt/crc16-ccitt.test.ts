import { describe, expect, test } from "../test/runtime";
import { crc16Ccitt } from "./crc16-ccitt";

describe("crc16Ccitt", () => {
	test("should match the CRC-16/CCITT-FALSE check value", () => {
		expect(crc16Ccitt("123456789")).toBe("29B1");
	});

	test("should return the initial value for an empty string", () => {
		expect(crc16Ccitt("")).toBe("FFFF");
	});

	test("should always return four uppercase hexadecimal digits", () => {
		for (let index = 0; index < 500; index++) {
			expect(crc16Ccitt(`payload-${index}`)).toMatch(/^[0-9A-F]{4}$/);
		}
	});

	test("should match the static QR Code example of the Bacen manual", () => {
		expect(
			crc16Ccitt(
				"00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304",
			),
		).toBe("1D3D");
	});

	test("should match the dynamic QR Code example of the Bacen manual", () => {
		expect(
			crc16Ccitt(
				"00020101021226700014br.gov.bcb.pix2548pix.example.com/8b3da2f39a4140d1a91abd93113bd4415204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304",
			),
		).toBe("64E4");
	});

	test("should match the BR Code manual example", () => {
		expect(
			crc16Ccitt(
				"00020104141234567890123426580014BR.GOV.BCB.PIX0136123e4567-e12b-12d1-a456-42665544000027300012BR.COM.OUTRO011001234567895204000053039865406123.455802BR5917NOME DO RECEBEDOR6008BRASILIA61087007490062190515RP12345678-201980390012BR.COM.OUTRO01190123.ABCD.3456.WXYZ6304",
			),
		).toBe("AD38");
	});

	test("should change when the payload changes", () => {
		expect(crc16Ccitt("A")).not.toBe(crc16Ccitt("B"));
	});
});
