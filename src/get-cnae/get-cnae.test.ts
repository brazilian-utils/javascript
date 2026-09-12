import { describe, expect, it } from "../_internals/test/runtime";
import { getCnae } from "./get-cnae";

describe("getCnae", () => {
	it("should return the CNAE entry for a known code as a string", () => {
		expect(getCnae("6201501")).toEqual({
			code: "6201-5/01",
			description: "DESENVOLVIMENTO DE PROGRAMAS DE COMPUTADOR SOB ENCOMENDA",
		});
	});

	it("should return the CNAE entry for a known code as a number", () => {
		expect(getCnae(6201501)).toEqual({
			code: "6201-5/01",
			description: "DESENVOLVIMENTO DE PROGRAMAS DE COMPUTADOR SOB ENCOMENDA",
		});
	});

	it("should return the CNAE entry for a masked code", () => {
		expect(getCnae("6201-5/01")).toEqual({
			code: "6201-5/01",
			description: "DESENVOLVIMENTO DE PROGRAMAS DE COMPUTADOR SOB ENCOMENDA",
		});
	});

	it("should pad a number to seven digits so codes starting with zero resolve (0111-3/01, cultivo de arroz)", () => {
		expect(getCnae(111301)).toEqual({ code: "0111-3/01", description: "CULTIVO DE ARROZ" });
		expect(getCnae("111301")).toBeNull();
	});

	it("should return a fresh object on every call", () => {
		const first = getCnae("6201501");
		const second = getCnae("6201501");
		expect(first).not.toBe(second);
	});

	it("should return null for an unknown seven digit code", () => {
		expect(getCnae("0000000")).toBeNull();
	});

	it("should return null for a code with a digit count different from seven", () => {
		expect(getCnae("620150")).toBeNull();
	});

	it("should return null for an empty string", () => {
		expect(getCnae("")).toBeNull();
	});

	it("should return null for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(getCnae(null)).toBeNull();
		// @ts-expect-error not a string or number
		expect(getCnae(undefined)).toBeNull();
	});
});
