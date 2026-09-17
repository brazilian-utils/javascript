import { parseTlv } from "../parse-tlv/parse-tlv";
import { describe, expect, test } from "../test/runtime";
import { formatTlv } from "./format-tlv";

describe("formatTlv", () => {
	test("should pad the length to two digits", () => {
		expect(formatTlv({ id: "00", value: "01" })).toBe("000201");
	});

	test("should keep a two digit length as is", () => {
		expect(formatTlv({ id: "59", value: "NOME DO RECEBEDOR" })).toBe("5917NOME DO RECEBEDOR");
	});

	test("should serialize an empty value", () => {
		expect(formatTlv({ id: "62", value: "" })).toBe("6200");
	});

	test("should round-trip through parseTlv", () => {
		for (let length = 0; length <= 99; length++) {
			const value = "x".repeat(length);

			expect(parseTlv(formatTlv({ id: "26", value }))).toEqual({ "26": value });
		}
	});
});
