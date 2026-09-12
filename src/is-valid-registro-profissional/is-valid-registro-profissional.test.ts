import { describe, expect, test } from "../_internals/test/runtime";
import { isValidRegistroProfissional } from "./is-valid-registro-profissional";

describe("isValidRegistroProfissional", () => {
	describe("should return false", () => {
		test("when value is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidRegistroProfissional(null, { council: "OAB" })).toBe(false);
		});

		test("when value is an empty string", () => {
			expect(isValidRegistroProfissional("", { council: "OAB" })).toBe(false);
		});

		test("when options is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidRegistroProfissional("123456/SP", null)).toBe(false);
		});

		test("when the council is not supported (e.g. CREA)", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidRegistroProfissional("1234567890", { council: "CREA" })).toBe(false);
		});

		test("when an OAB number has no UF", () => {
			expect(isValidRegistroProfissional("123456", { council: "OAB" })).toBe(false);
		});

		test("when an OAB number has too many digits", () => {
			expect(isValidRegistroProfissional("1234567/SP", { council: "OAB" })).toBe(false);
		});

		test("when the UF is not a real Brazilian state code", () => {
			expect(isValidRegistroProfissional("123456/ZZ", { council: "OAB" })).toBe(false);
		});

		test("when the UF does not match options.stateCode", () => {
			expect(isValidRegistroProfissional("123456-RJ", { council: "OAB", stateCode: "SP" })).toBe(
				false,
			);
		});

		test("when a CRP number has letters instead of the regional code", () => {
			expect(isValidRegistroProfissional("SP/12345", { council: "CRP" })).toBe(false);
		});

		test("when a CRC number is missing the category letter", () => {
			expect(isValidRegistroProfissional("SP-123456-3", { council: "CRC" })).toBe(false);
		});

		test("when a CRC number is missing the check digit", () => {
			expect(isValidRegistroProfissional("SP-123456/O", { council: "CRC" })).toBe(false);
		});
	});

	describe("should return true", () => {
		test("for a valid OAB number", () => {
			expect(isValidRegistroProfissional("123456/SP", { council: "OAB" })).toBe(true);
		});

		test("for a valid OAB number matching options.stateCode", () => {
			expect(isValidRegistroProfissional("123456-SP", { council: "OAB", stateCode: "SP" })).toBe(
				true,
			);
		});

		test("for a valid CRM number", () => {
			expect(isValidRegistroProfissional("54321/RJ", { council: "CRM" })).toBe(true);
		});

		test("for a valid CRO number", () => {
			expect(isValidRegistroProfissional("12345/MG", { council: "CRO" })).toBe(true);
		});

		test("for a valid CRP number, ignoring options.stateCode", () => {
			expect(isValidRegistroProfissional("06/12345", { council: "CRP", stateCode: "SP" })).toBe(
				true,
			);
		});

		test("for a valid CRC number", () => {
			expect(isValidRegistroProfissional("SP-123456/O-3", { council: "CRC" })).toBe(true);
		});

		test("for a valid CRC number of a técnico em contabilidade", () => {
			expect(isValidRegistroProfissional("RJ-654321/T-9", { council: "CRC" })).toBe(true);
		});
	});
});
