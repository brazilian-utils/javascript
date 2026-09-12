import { describe, expect, test } from "../_internals/test/runtime";
import { formatCei } from "./format-cei";

describe("formatCei", () => {
	test("should format a full 12 digit value", () => {
		expect(formatCei("277297118187")).toBe("27.729.71181/87");
	});

	test("should format a number input", () => {
		expect(formatCei(249_859_674_386)).toBe("24.985.96743/86");
	});

	test("should format progressively as digits are typed", () => {
		expect(formatCei("2")).toBe("2");
		expect(formatCei("27")).toBe("27");
		expect(formatCei("277")).toBe("27.7");
		expect(formatCei("2772")).toBe("27.72");
		expect(formatCei("27729")).toBe("27.729");
		expect(formatCei("277297")).toBe("27.729.7");
	});

	test("should remove mask characters before formatting", () => {
		expect(formatCei("11.583.00249/85")).toBe("11.583.00249/85");
	});

	test("should truncate values longer than 12 digits", () => {
		expect(formatCei("2772971181870000")).toBe("27.729.71181/87");
	});

	test("should pad the value with leading zeros when options.pad is true", () => {
		expect(formatCei("249", { pad: true })).toBe("00.000.00002/49");
	});

	test("should return an empty string for an empty string", () => {
		expect(formatCei("")).toBe("");
	});

	test("should return an empty string for null", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatCei(null)).toBe("");
	});

	test("should return an empty string for undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatCei()).toBe("");
	});
});
