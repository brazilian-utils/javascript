import { describe, expect, it } from "../_internals/test/runtime";
import { getLegalNature } from "./get-legal-nature";

describe("getLegalNature", () => {
	it("should reject a code with letters attached, like isValidLegalNature does", () => {
		expect(getLegalNature("2062a")).toBeNull();
		expect(getLegalNature("a2062")).toBeNull();
		expect(getLegalNature("206-2")).toEqual({
			code: "2062",
			description: getLegalNature("2062")?.description,
		});
	});

	it("should return the legal nature entry for a known code as a string", () => {
		expect(getLegalNature("2062")).toEqual({
			code: "2062",
			description: "Sociedade Empresária Limitada",
		});
	});

	it("should return the legal nature entry for a known code as a number", () => {
		expect(getLegalNature(2062)).toEqual({
			code: "2062",
			description: "Sociedade Empresária Limitada",
		});
	});

	it("should return the legal nature entry for a masked code (206-2)", () => {
		expect(getLegalNature("206-2")).toEqual({
			code: "2062",
			description: "Sociedade Empresária Limitada",
		});
	});

	it("should return a fresh object on every call", () => {
		const first = getLegalNature("2062");
		const second = getLegalNature("2062");
		expect(first).not.toBe(second);
	});

	it("should return null for an unknown 4 digit code", () => {
		expect(getLegalNature("0000")).toBeNull();
	});

	it("should return null for a code with a length different from 4", () => {
		expect(getLegalNature("206")).toBeNull();
	});

	it("should return null for an empty string", () => {
		expect(getLegalNature("")).toBeNull();
	});

	it("should return null for null", () => {
		// @ts-expect-error not a string or number
		expect(getLegalNature(null)).toBeNull();
	});

	it("should return null for undefined", () => {
		// @ts-expect-error not a string or number
		expect(getLegalNature(undefined)).toBeNull();
	});
});
