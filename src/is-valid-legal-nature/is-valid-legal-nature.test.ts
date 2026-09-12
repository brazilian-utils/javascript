import { describe, expect, it } from "../_internals/test/runtime";
import { isValidLegalNature } from "./is-valid-legal-nature";

describe("isValidLegalNature", () => {
	it("should validate legal nature codes", () => {
		expect(isValidLegalNature("2062")).toBe(true);
		expect(isValidLegalNature("206-2")).toBe(true);
		expect(isValidLegalNature("9999")).toBe(false);
	});

	it("should validate codes introduced by the 2021 CONCLA table", () => {
		expect(isValidLegalNature("5010")).toBe(true);
		expect(isValidLegalNature("1244")).toBe(true);
		expect(isValidLegalNature("1252")).toBe(true);
		expect(isValidLegalNature("2348")).toBe(true);
		expect(isValidLegalNature("2356")).toBe(true);
		expect(isValidLegalNature("3301")).toBe(true);
		expect(isValidLegalNature("4090")).toBe(true);
		expect(isValidLegalNature("4111")).toBe(true);
		expect(isValidLegalNature("4120")).toBe(true);
	});

	it("should keep validating codes extinguished by CONCLA", () => {
		expect(isValidLegalNature("5002")).toBe(true);
		expect(isValidLegalNature("3123")).toBe(true);
		expect(isValidLegalNature("2076")).toBe(true);
	});

	it("should reject codes with a length different from 4", () => {
		expect(isValidLegalNature("206")).toBe(false);
		expect(isValidLegalNature("20620")).toBe(false);
		expect(isValidLegalNature("")).toBe(false);
		// @ts-expect-error not a string
		expect(isValidLegalNature(null)).toBe(false);
	});

	it("should reject any character other than digits and the mask", () => {
		expect(isValidLegalNature("2062a")).toBe(false);
		expect(isValidLegalNature("a2062")).toBe(false);
		expect(isValidLegalNature("20/62")).toBe(false);
		expect(isValidLegalNature(" 206-2 ")).toBe(true);
		expect(isValidLegalNature("206.2")).toBe(true);
	});

	it("should return false for names inherited from Object.prototype", () => {
		expect(isValidLegalNature("constructor")).toBe(false);
		expect(isValidLegalNature("toString")).toBe(false);
		expect(isValidLegalNature("__proto__")).toBe(false);
	});
});
