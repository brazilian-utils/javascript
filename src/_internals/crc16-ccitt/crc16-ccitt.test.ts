import { describe, expect, test } from "../test/runtime";
import { crc16Ccitt } from "./crc16-ccitt";

const reference = (value: string): string => {
	let crc = 0xff_ff;

	for (const byte of new TextEncoder().encode(value)) {
		crc ^= byte << 8;

		for (let bit = 0; bit < 8; bit++) {
			crc = (crc & 0x80_00) === 0 ? (crc << 1) & 0xff_ff : ((crc << 1) ^ 0x10_21) & 0xff_ff;
		}
	}

	return crc.toString(16).toUpperCase().padStart(4, "0");
};

describe("crc16Ccitt", () => {
	test("should match the CRC-16/CCITT-FALSE check value", () => {
		expect(crc16Ccitt("123456789")).toBe("29B1");
	});

	test("should checksum the UTF-8 bytes of a character from U+0080 up, not its code", () => {
		expect(crc16Ccitt("\u0080")).toBe("FCB1");
		expect(crc16Ccitt("a\u0080b")).toBe("B44D");
		expect(crc16Ccitt("\u007F")).toBe("6E88");
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

	test("should checksum the UTF-8 bytes of a value with non-ASCII characters", () => {
		for (const value of ["é", "abc é", "日本語", "a😀b", "\uD800", "São Paulo"]) {
			expect(crc16Ccitt(value)).toBe(reference(value));
		}
	});

	test("should change when the payload changes", () => {
		expect(crc16Ccitt("A")).not.toBe(crc16Ccitt("B"));
	});
});
