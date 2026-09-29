import { describe, expect, test } from "../test/runtime";
import { parseTlv } from "./parse-tlv";

describe("parseTlv", () => {
	describe("should return the objects", () => {
		test("when the string holds a single object", () => {
			expect(parseTlv("000201")).toEqual({ "00": "01" });
		});

		test("when the string holds several objects", () => {
			expect(parseTlv("00020153039865802BR")).toEqual({
				"00": "01",
				"53": "986",
				"58": "BR",
			});
		});

		test("when an object has the shortest value, of length 01", () => {
			expect(parseTlv("0001A")).toEqual({ "00": "A" });
		});

		test("when the string is empty", () => {
			expect(parseTlv("")).toEqual({});
		});

		test("when two different ids follow each other", () => {
			expect(parseTlv("0001A0101B")).toEqual({ "00": "A", "01": "B" });
		});
	});

	describe("should return null", () => {
		test("when an id repeats, whatever the values are", () => {
			expect(parseTlv("0001A0001B")).toBeNull();
			expect(parseTlv("0001A0001A")).toBeNull();
			expect(parseTlv("0001A0101B0001C")).toBeNull();
		});

		test("when a value runs past the end of the string", () => {
			expect(parseTlv("0003ab")).toBeNull();
		});

		test("when an id is not made of two digits", () => {
			expect(parseTlv("0A0201")).toBeNull();
		});

		test("when a length is not made of two digits", () => {
			expect(parseTlv("00A201")).toBeNull();
		});

		test("when an object declares the length 00, below the 01 to 99 of the EMV specification", () => {
			expect(parseTlv("0000")).toBeNull();
			expect(parseTlv("0000530398")).toBeNull();
			expect(parseTlv("53039860000")).toBeNull();
		});

		test("when the string is too short to hold an object", () => {
			expect(parseTlv("00")).toBeNull();
		});
	});
});
