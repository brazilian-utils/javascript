import { describe, expect, it } from "../_internals/test/runtime";
import { formatCns } from "./format-cns";

describe("formatCns", () => {
	it("should format a CNS with the 3-4-4-4 space mask", () => {
		expect(formatCns("")).toBe("");
		expect(formatCns("1")).toBe("1");
		expect(formatCns("12")).toBe("12");
		expect(formatCns("123")).toBe("123");
		expect(formatCns("1234")).toBe("123 4");
		expect(formatCns("123456789010001")).toBe("123 4567 8901 0001");
	});

	it("should format a number CNS with the space mask", () => {
		expect(formatCns(123_456_789_010_001)).toBe("123 4567 8901 0001");
	});

	it("should pad the value with leading zeros when pad is true", () => {
		expect(formatCns("", { pad: true })).toBe("000 0000 0000 0000");
		expect(formatCns("89010001", { pad: true })).toBe("000 0000 8901 0001");
	});

	it("should not add digits after the CNS length (15)", () => {
		expect(formatCns("123456789010001999")).toBe("123 4567 8901 0001");
	});

	it("should remove all non numeric characters", () => {
		expect(formatCns("123.456.789-01/0001")).toBe("123 4567 8901 0001");
	});

	it("should return an empty string when the value is null or undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatCns(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatCns()).toBe("");
	});
});
