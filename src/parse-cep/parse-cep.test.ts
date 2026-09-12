import { describe, expect, it } from "../_internals/test/runtime";
import { parseCep } from "./parse-cep";

describe("parseCep", () => {
	it("should remove CEP mask characters", () => {
		expect(parseCep("01001-000")).toBe("01001000");
	});

	it("should remove non numeric characters", () => {
		expect(parseCep("a0.10cr01?00#ab0")).toBe("01001000");
	});

	it("should ignore digits after the CEP length", () => {
		expect(parseCep("01001000123")).toBe("01001000");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseCep(null)).toBe("");
	});
});
