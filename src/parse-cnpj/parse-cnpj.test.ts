import { describe, expect, it } from "../_internals/test/runtime";
import { parseCnpj } from "./parse-cnpj";

describe("parseCnpj", () => {
	it("should remove CNPJ mask characters", () => {
		expect(parseCnpj("46.843.485/0001-86")).toBe("46843485000186");
	});

	it("should remove non numeric characters", () => {
		expect(parseCnpj("46.?ABC843.485/0001-86abc")).toBe("46843485000186");
	});

	it("should keep alphanumeric characters for version 2", () => {
		expect(parseCnpj("Q0.SLF.MBD/7VX4-39", { version: 2 })).toBe("Q0SLFMBD7VX439");
	});

	it("should ignore digits after the CNPJ length", () => {
		expect(parseCnpj("46843485000186123")).toBe("46843485000186");
	});

	it("should ignore characters after the CNPJ length for version 2", () => {
		expect(parseCnpj("Q0.SLF.MBD/7VX4-39ABC", { version: 2 })).toBe("Q0SLFMBD7VX439");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseCnpj(null)).toBe("");
	});
});
