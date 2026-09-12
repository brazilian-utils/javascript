import { describe, expect, it } from "../_internals/test/runtime";
import { parsePhone } from "./parse-phone";

describe("parsePhone", () => {
	it("should remove phone mask characters", () => {
		expect(parsePhone("(11) 98888-7777")).toBe("11988887777");
		expect(parsePhone("98888-7777")).toBe("988887777");
	});

	it("should remove non numeric characters", () => {
		expect(parsePhone("+55 (11) 98888-7777")).toBe("11988887777");
	});

	it("should ignore digits after the phone length", () => {
		expect(parsePhone("11988887777123")).toBe("11988887777");
	});

	it("should remove the country code from every international notation", () => {
		expect(parsePhone("+5511988887777")).toBe("11988887777");
		expect(parsePhone("+55 11 98888-7777")).toBe("11988887777");
		expect(parsePhone("5511988887777")).toBe("11988887777");
		expect(parsePhone("005511988887777")).toBe("11988887777");
		expect(parsePhone("+55 (11) 3000-0000")).toBe("1130000000");
		expect(parsePhone("551130000000")).toBe("1130000000");
	});

	it("should keep a leading 55 that is an area code", () => {
		expect(parsePhone("55988887777")).toBe("55988887777");
		expect(parsePhone("(55) 3000-0000")).toBe("5530000000");
		expect(parsePhone("+55 (55) 98888-7777")).toBe("55988887777");
	});

	it("should keep the digits when the country code leaves an implausible number", () => {
		expect(parsePhone("55123")).toBe("55123");
	});

	it("should keep service numbers untouched", () => {
		expect(parsePhone("0800 123 4567")).toBe("08001234567");
		expect(parsePhone("4004-1234")).toBe("40041234");
		expect(parsePhone("190")).toBe("190");
	});

	it("should return an empty string for nullish values", () => {
		// @ts-expect-error: intentionally invalid input
		expect(parsePhone(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(parsePhone()).toBe("");
	});

	it("should accept numbers", () => {
		expect(parsePhone(11_988_887_777)).toBe("11988887777");
	});
});
