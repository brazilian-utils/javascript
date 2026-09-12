import { describe, expect, it } from "../_internals/test/runtime";
import { getCbo } from "./get-cbo";

describe("getCbo", () => {
	it("should return the occupation for a code without a mask", () => {
		expect(getCbo("212405")).toEqual({
			code: "212405",
			title: "Analista de desenvolvimento de sistemas",
		});
	});

	it("should return the occupation for a code with the hyphen mask", () => {
		expect(getCbo("2124-05")).toEqual({
			code: "212405",
			title: "Analista de desenvolvimento de sistemas",
		});
	});

	it("should return the occupation for a code given as a number", () => {
		expect(getCbo(212405)).toEqual({
			code: "212405",
			title: "Analista de desenvolvimento de sistemas",
		});
	});

	it("should pad a number to six digits so codes starting with zero resolve (0102-05, Oficial da Aeronáutica)", () => {
		expect(getCbo(10205)).toEqual({ code: "010205", title: "Oficial da Aeronáutica" });
		expect(getCbo("10205")).toBeNull();
	});

	it("should return a fresh object that does not leak the internal table", () => {
		const first = getCbo("212405");
		const second = getCbo("212405");
		expect(first).not.toBe(second);
	});

	it("should return null for an unknown six digit code", () => {
		expect(getCbo("000000")).toBeNull();
	});

	it("should return null when the digit count is not six", () => {
		expect(getCbo("21240")).toBeNull();
		expect(getCbo("2124055")).toBeNull();
	});

	it("should return null for an empty string", () => {
		expect(getCbo("")).toBeNull();
	});

	it("should return null for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(getCbo(null)).toBeNull();
		// @ts-expect-error not a string or number
		expect(getCbo(undefined)).toBeNull();
	});

	it("should return null for whitespace only", () => {
		expect(getCbo("      ")).toBeNull();
	});
});
