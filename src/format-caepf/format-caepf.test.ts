import { describe, expect, test } from "../_internals/test/runtime";
import { formatCaepf } from "./format-caepf";

describe("formatCaepf", () => {
	test("should format a full 14 digit value", () => {
		expect(formatCaepf("29311861000184")).toBe("293.118.610/001-84");
	});

	test("should format a number input", () => {
		expect(formatCaepf(41142260000101)).toBe("411.422.600/001-01");
	});

	test("should format progressively as digits are typed", () => {
		expect(formatCaepf("2")).toBe("2");
		expect(formatCaepf("29")).toBe("29");
		expect(formatCaepf("293")).toBe("293");
		expect(formatCaepf("2931")).toBe("293.1");
		expect(formatCaepf("29311")).toBe("293.11");
		expect(formatCaepf("293118")).toBe("293.118");
	});

	test("should remove mask characters before formatting", () => {
		expect(formatCaepf("293.118.610/001-84")).toBe("293.118.610/001-84");
	});

	test("should truncate values longer than 14 digits", () => {
		expect(formatCaepf("293118610001840000")).toBe("293.118.610/001-84");
	});

	test("should pad the value with leading zeros when options.pad is true", () => {
		expect(formatCaepf("184", { pad: true })).toBe("000.000.000/001-84");
	});

	test("should not pad the value when options.pad is not given", () => {
		expect(formatCaepf("184")).toBe("184");
	});

	test("should return an empty string for an empty string", () => {
		expect(formatCaepf("")).toBe("");
	});

	test("should return an empty string for null", () => {
		// @ts-expect-error
		expect(formatCaepf(null)).toBe("");
	});

	test("should return an empty string for undefined", () => {
		// @ts-expect-error
		expect(formatCaepf(undefined)).toBe("");
	});
});
