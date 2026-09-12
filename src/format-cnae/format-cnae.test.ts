import { describe, expect, it } from "../_internals/test/runtime";
import { formatCnae } from "./format-cnae";

describe("formatCnae", () => {
	it("should format a CNAE code given as digits", () => {
		expect(formatCnae("6201501")).toBe("6201-5/01");
	});

	it("should format a CNAE code given as a number", () => {
		expect(formatCnae(6201501)).toBe("6201-5/01");
	});

	it("should format a CNAE code that already has the mask", () => {
		expect(formatCnae("6201-5/01")).toBe("6201-5/01");
	});

	it("should not validate whether the code exists in the official table", () => {
		expect(formatCnae("0000000")).toBe("0000-0/00");
	});

	it("should return an empty string for an empty value", () => {
		expect(formatCnae("")).toBe("");
	});

	it("should return an empty string for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(formatCnae(null)).toBe("");
		// @ts-expect-error not a string or number
		expect(formatCnae(undefined)).toBe("");
	});
});
