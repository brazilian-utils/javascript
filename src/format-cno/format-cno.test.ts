import { describe, expect, test } from "../_internals/test/runtime";
import { formatCno } from "./format-cno";

describe("formatCno", () => {
	test("should format a full 12 digit value", () => {
		expect(formatCno("111130137368")).toBe("11.113.01373/68");
	});

	test("should format a number input", () => {
		expect(formatCno(401_800_097_960)).toBe("40.180.00979/60");
	});

	test("should format progressively as digits are typed", () => {
		expect(formatCno("1")).toBe("1");
		expect(formatCno("11")).toBe("11");
		expect(formatCno("111")).toBe("11.1");
		expect(formatCno("1111")).toBe("11.11");
		expect(formatCno("11113")).toBe("11.113");
		expect(formatCno("111130")).toBe("11.113.0");
	});

	test("should remove mask characters before formatting", () => {
		expect(formatCno("11.084.01680/62")).toBe("11.084.01680/62");
	});

	test("should truncate values longer than 12 digits", () => {
		expect(formatCno("1111301373680000")).toBe("11.113.01373/68");
	});

	test("should pad the value with leading zeros when options.pad is true", () => {
		expect(formatCno("979", { pad: true })).toBe("00.000.00009/79");
	});

	test("should return an empty string for an empty string", () => {
		expect(formatCno("")).toBe("");
	});

	test("should return an empty string for null", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatCno(null)).toBe("");
	});

	test("should return an empty string for undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatCno()).toBe("");
	});
});
