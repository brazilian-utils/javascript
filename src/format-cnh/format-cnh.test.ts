import { describe, expect, it } from "../_internals/test/runtime";
import { formatCnh } from "./format-cnh";

describe("formatCnh", () => {
	it("should format CNH values", () => {
		expect(formatCnh("")).toBe("");
		expect(formatCnh("0")).toBe("0");
		expect(formatCnh("00")).toBe("00");
		expect(formatCnh("000")).toBe("000");
		expect(formatCnh("0000")).toBe("0000");
		expect(formatCnh("00000")).toBe("00000");
		expect(formatCnh("000000")).toBe("000000");
		expect(formatCnh("0000000")).toBe("0000000");
		expect(formatCnh("00000000")).toBe("00000000");
		expect(formatCnh("000000001")).toBe("000000001");
		expect(formatCnh("0000000011")).toBe("000000001-1");
		expect(formatCnh("00000000119")).toBe("000000001-19");
	});

	it("should remove non numeric characters", () => {
		expect(formatCnh("000.000.001-19")).toBe("000000001-19");
	});

	it("should return an empty string for null or undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatCnh(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatCnh()).toBe("");
	});
});
