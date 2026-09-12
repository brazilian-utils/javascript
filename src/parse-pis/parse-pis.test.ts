import { describe, expect, it } from "../_internals/test/runtime";
import { parsePis } from "./parse-pis";

describe("parsePis", () => {
	it("should remove PIS mask characters", () => {
		expect(parsePis("123.45678.90-1")).toBe("12345678901");
	});

	it("should remove non numeric characters", () => {
		expect(parsePis("123#Error*&@#45678#Char!90-1")).toBe("12345678901");
	});

	it("should ignore digits after the PIS length", () => {
		expect(parsePis("12345678901123")).toBe("12345678901");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parsePis(null)).toBe("");
	});
});
