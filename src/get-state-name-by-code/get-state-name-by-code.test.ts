import { describe, expect, it } from "../_internals/test/runtime";
import { getStateNameByCode } from "./get-state-name-by-code";

describe("getStateNameByCode", () => {
	it("should return the full name for an uppercase code", () => {
		expect(getStateNameByCode("SP")).toBe("São Paulo");
	});

	it("should be case-insensitive", () => {
		expect(getStateNameByCode("sp")).toBe("São Paulo");
		expect(getStateNameByCode("Sp")).toBe("São Paulo");
	});

	it("should trim leading and trailing whitespace", () => {
		expect(getStateNameByCode("  RJ  ")).toBe("Rio de Janeiro");
	});

	it("should combine casing and trimming together", () => {
		expect(getStateNameByCode("  rj  ")).toBe("Rio de Janeiro");
	});

	it("should resolve the Distrito Federal code", () => {
		expect(getStateNameByCode("DF")).toBe("Distrito Federal");
	});

	it("should return null for a code that matches no state", () => {
		expect(getStateNameByCode("ZZ")).toBeNull();
	});

	it("should return null for an empty string", () => {
		expect(getStateNameByCode("")).toBeNull();
	});

	it("should return null for whitespace only", () => {
		expect(getStateNameByCode("   ")).toBeNull();
	});

	it("should return null for null", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getStateNameByCode(null)).toBeNull();
	});

	it("should return null for undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getStateNameByCode()).toBeNull();
	});

	it("should return null for a number", () => {
		// @ts-expect-error: intentionally invalid input
		expect(getStateNameByCode(11)).toBeNull();
	});
});
