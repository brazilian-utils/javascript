import * as fc from "fast-check";

import { DATA, type StateCode } from "../_internals/constants/states";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { type RegistroProfissionalCouncil } from "./constants";
import {
	isValidRegistroProfissional,
	type IsValidRegistroProfissionalOptions,
} from "./is-valid-registro-profissional";

const STATE_CODES = DATA.map((state) => state.code);

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

	describe("properties", () => {
		const states = fc.constantFrom(...STATE_CODES);

		const numbers = fc.integer({ min: 1000, max: 999_999 });

		test("should accept a well-formed number for every council", () => {
			fc.assert(
				fc.property(states, numbers, (stateCode, number) => {
					for (const council of ["OAB", "CRM", "CRO"] as const) {
						expect(isValidRegistroProfissional(`${number}/${stateCode}`, { council })).toBe(true);
						expect(
							isValidRegistroProfissional(`${number}-${stateCode}`, { council, stateCode }),
						).toBe(true);
					}

					expect(isValidRegistroProfissional(`06/${number}`, { council: "CRP" })).toBe(true);
					expect(
						isValidRegistroProfissional(`${stateCode}-${number}/O-3`, { council: "CRC" }),
					).toBe(true);
				}),
			);
		});

		test("should reject a registration whose UF is not the expected one", () => {
			fc.assert(
				fc.property(states, states, numbers, (stateCode, other, number) => {
					fc.pre(stateCode !== other);

					const value = `${number}/${other}`;

					expect(isValidRegistroProfissional(value, { council: "OAB", stateCode })).toBe(false);
				}),
			);
		});

		test("should reject a number that carries no UF at all", () => {
			fc.assert(
				fc.property(numbers, (number) => {
					expect(isValidRegistroProfissional(`${number}`, { council: "CRM" })).toBe(false);
				}),
			);
		});

		test("should never throw and always judge a registration with a boolean", () => {
			fc.assert(
				fc.property(fc.anything(), fc.anything(), (value, options) => {
					const result = isValidRegistroProfissional(value as string, options as never);

					expect(typeof result).toBe("boolean");
				}),
			);
		});
	});
});

describe("isValidRegistroProfissional types", () => {
	test("should take a string, required options, and return a boolean", () => {
		expectTypeOf(isValidRegistroProfissional).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(isValidRegistroProfissional)
			.parameter(1)
			.toEqualTypeOf<IsValidRegistroProfissionalOptions>();
		expectTypeOf<
			IsValidRegistroProfissionalOptions["council"]
		>().toEqualTypeOf<RegistroProfissionalCouncil>();
		expectTypeOf<IsValidRegistroProfissionalOptions["stateCode"]>().toEqualTypeOf<
			StateCode | undefined
		>();
		expectTypeOf<RegistroProfissionalCouncil>().toEqualTypeOf<
			"OAB" | "CRM" | "CRO" | "CRP" | "CRC"
		>();
		expectTypeOf(isValidRegistroProfissional).returns.toEqualTypeOf<boolean>();
	});
});
