import { CEP_LENGTH } from "../_internals/constants/cep";
import { describe, expect, it } from "../_internals/test/runtime";
import { formatCep } from "./format-cep";

describe("formatCep", () => {
	it("should format CEP with mask", () => {
		expect(formatCep("")).toBe("");
		expect(formatCep("0")).toBe("0");
		expect(formatCep("01")).toBe("01");
		expect(formatCep("010")).toBe("010");
		expect(formatCep("0100")).toBe("0100");
		expect(formatCep("01001")).toBe("01001");
		expect(formatCep("010010")).toBe("01001-0");
		expect(formatCep("0100100")).toBe("01001-00");
		expect(formatCep("01001000")).toBe("01001-000");
	});

	it(`should NOT add digits after the CEP length (${CEP_LENGTH})`, () => {
		expect(formatCep("01001000000000")).toBe("01001-000");
	});

	it("should remove all non numeric characters", () => {
		expect(formatCep("a0.10cr01?00#ab0")).toBe("01001-000");
	});

	it("should return an empty string for null or undefined", () => {
		// @ts-expect-error
		expect(formatCep(null)).toBe("");
		// @ts-expect-error
		expect(formatCep(undefined)).toBe("");
	});
});
