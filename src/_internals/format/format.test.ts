import { describe, expect, it } from "../test/runtime";
import { format } from "./format";

describe("format", () => {
	it("should format value according to pattern without padding", () => {
		const result = format({ value: "123456", pattern: "00-00-00" });
		expect(result).toBe("12-34-56");
	});

	it("should format value according to pattern with padding", () => {
		const result = format({ value: "1234", pattern: "00-00-00", pad: true });
		expect(result).toBe("00-12-34");
	});

	it("should handle pattern longer than value without padding", () => {
		const result = format({ value: "12", pattern: "00-00-00" });
		expect(result).toBe("12");
	});

	it("should handle pattern longer than value with padding", () => {
		const result = format({ value: "12", pattern: "00-00-00", pad: true });
		expect(result).toBe("00-00-12");
	});

	it("should handle pattern with non-digit characters", () => {
		const result = format({ value: "123456", pattern: "(00) 0000-0000" });
		expect(result).toBe("(12) 3456");
	});

	it("should handle empty value", () => {
		const result = format({ value: "", pattern: "00-00-00" });
		expect(result).toBe("");
	});

	it("should handle empty pattern", () => {
		const result = format({ value: "123456", pattern: "" });
		expect(result).toBe("");
	});

	it("should replace the positions marked with * by *", () => {
		expect(format({ value: "12345678901", pattern: "***.000.000-**" })).toBe("***.456.789-**");
	});

	it("should leave separators untouched around the hidden positions", () => {
		expect(format({ value: "12345678000195", pattern: "**.000.000/0000-**" })).toBe(
			"**.345.678/0001-**",
		);
	});

	it("should copy every position when the pattern has no *", () => {
		expect(format({ value: "12345678901", pattern: "000.000.000-00" })).toBe("123.456.789-01");
	});

	it("should stop at the length of the value when the pattern has *", () => {
		expect(format({ value: "123", pattern: "***.000.000-**" })).toBe("***");
		expect(format({ value: "", pattern: "***.000.000-**" })).toBe("");
	});

	it("should pad for any truthy pad value and skip padding for any falsy one", () => {
		// @ts-expect-error: intentionally invalid input
		expect(format({ value: "12", pattern: "00-00-00", pad: 1 })).toBe("00-00-12");
		// @ts-expect-error: intentionally invalid input
		expect(format({ value: "12", pattern: "00-00-00", pad: 0 })).toBe("12");
	});

	it("should count * as a slot when padding", () => {
		expect(format({ value: "123", pattern: "***.000.000-**", pad: true })).toBe("***.000.001-**");
	});
});
