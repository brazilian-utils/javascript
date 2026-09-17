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

		test("when an object has an empty value", () => {
			expect(parseTlv("0000")).toEqual({ "00": "" });
		});

		test("when the string is empty", () => {
			expect(parseTlv("")).toEqual({});
		});

		test("when an id repeats, keeping the last one", () => {
			expect(parseTlv("0001A0001B")).toEqual({ "00": "B" });
		});
	});

	describe("should return null", () => {
		test("when a value runs past the end of the string", () => {
			expect(parseTlv("0003ab")).toBeNull();
		});

		test("when an id is not made of two digits", () => {
			expect(parseTlv("0A0201")).toBeNull();
		});

		test("when a length is not made of two digits", () => {
			expect(parseTlv("00A201")).toBeNull();
		});

		test("when the string is too short to hold an object", () => {
			expect(parseTlv("00")).toBeNull();
		});
	});
});
