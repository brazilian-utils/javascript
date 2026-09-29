import { describe, expect, it } from "../test/runtime";
import { readLegalNatureCode } from "./read-legal-nature-code";

describe("readLegalNatureCode", () => {
	it("should read the bare digits and the masked forms", () => {
		expect(readLegalNatureCode("2062")).toBe("2062");
		expect(readLegalNatureCode("206-2")).toBe("2062");
		expect(readLegalNatureCode("206.2")).toBe("2062");
		expect(readLegalNatureCode("206/2")).toBe("2062");
		expect(readLegalNatureCode("206 2")).toBe("2062");
		expect(readLegalNatureCode("206 - 2")).toBe("2062");
		expect(readLegalNatureCode(" 206-2 ")).toBe("2062");
	});

	it("should read a non-negative safe integer", () => {
		expect(readLegalNatureCode(2062)).toBe("2062");
	});

	it("should return an empty string for a separator anywhere but after the third digit", () => {
		expect(readLegalNatureCode("-2062")).toBe("");
		expect(readLegalNatureCode("2062-")).toBe("");
		expect(readLegalNatureCode("-2-0-6-2")).toBe("");
		expect(readLegalNatureCode("20.6.2")).toBe("");
		expect(readLegalNatureCode("20 62")).toBe("");
	});

	it("should return an empty string for a wrong length, letters or a value that is not a code", () => {
		expect(readLegalNatureCode("206")).toBe("");
		expect(readLegalNatureCode("20620")).toBe("");
		expect(readLegalNatureCode("2062a")).toBe("");
		expect(readLegalNatureCode("")).toBe("");
		expect(readLegalNatureCode(-2062)).toBe("");
		expect(readLegalNatureCode(206.2)).toBe("");
		expect(readLegalNatureCode(null)).toBe("");
	});
});
