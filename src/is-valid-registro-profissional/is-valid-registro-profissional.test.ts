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
			expect(isValidRegistroProfissional({ value: null, council: "OAB" })).toBe(false);
		});

		test("when value is an empty string", () => {
			expect(isValidRegistroProfissional({ value: "", council: "OAB" })).toBe(false);
		});

		test("when the single argument is not an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidRegistroProfissional(null)).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidRegistroProfissional()).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidRegistroProfissional("123456/SP")).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidRegistroProfissional(123_456)).toBe(false);
		});

		test("when the value is a number, even when its digits would match as a string", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidRegistroProfissional({ value: 2_412_345, council: "CRP" })).toBe(false);
		});

		test("when the object carries no value", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidRegistroProfissional({ council: "OAB" })).toBe(false);
		});

		test("when the object carries no council", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidRegistroProfissional({ value: "123456/SP" })).toBe(false);
		});

		test("when the council is not supported (e.g. CREA)", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidRegistroProfissional({ value: "1234567890", council: "CREA" })).toBe(false);
		});

		test("when an OAB number has no UF", () => {
			expect(isValidRegistroProfissional({ value: "123456", council: "OAB" })).toBe(false);
		});

		test("when an OAB number has too many digits", () => {
			expect(isValidRegistroProfissional({ value: "1234567/SP", council: "OAB" })).toBe(false);
		});

		test("when the UF is not a real Brazilian state code", () => {
			expect(isValidRegistroProfissional({ value: "123456/ZZ", council: "OAB" })).toBe(false);
		});

		test("when the UF does not match params.stateCode", () => {
			expect(
				isValidRegistroProfissional({ value: "123456-RJ", council: "OAB", stateCode: "SP" }),
			).toBe(false);
		});

		test("when a CRP number has letters instead of the regional code", () => {
			expect(isValidRegistroProfissional({ value: "SP/12345", council: "CRP" })).toBe(false);
		});

		test("when a CRC number is missing the category letter", () => {
			expect(isValidRegistroProfissional({ value: "SP-123456-3", council: "CRC" })).toBe(false);
		});

		test("when a CRC number is missing the check digit", () => {
			expect(isValidRegistroProfissional({ value: "SP-123456/O", council: "CRC" })).toBe(false);
		});

		test("when a CRC number of ordem has 5 digits instead of the 6 of the Manual de Registro", () => {
			expect(isValidRegistroProfissional({ value: "SP-12345/O-3", council: "CRC" })).toBe(false);
		});

		test("when a CRC number carries a letter that is not a tipo de registro", () => {
			expect(isValidRegistroProfissional({ value: "SP-123456/X-3", council: "CRC" })).toBe(false);
		});

		test('when a CRC number puts "T" in the tipo de registro slot, which the Manual de Registro restricts to O and P', () => {
			expect(isValidRegistroProfissional({ value: "SP-123456/T-3", council: "CRC" })).toBe(false);
		});

		test('when a CRC number puts "S" in the tipo de registro slot', () => {
			expect(isValidRegistroProfissional({ value: "SP-123456/S-3", council: "CRC" })).toBe(false);
		});

		test("when the destination UF of a transferred CRC number is not a real Brazilian state code", () => {
			expect(isValidRegistroProfissional({ value: "SP-123456/O-3 T-ZZ", council: "CRC" })).toBe(
				false,
			);
		});

		test("when a transferred CRC number carries no destination UF at all", () => {
			expect(isValidRegistroProfissional({ value: "SP-123456/O-3 T", council: "CRC" })).toBe(false);
		});

		test("when a CRP regional code is 00, below the CRP-01 of the CFP system", () => {
			expect(isValidRegistroProfissional({ value: "00/12345", council: "CRP" })).toBe(false);
		});

		test("when a CRP regional code is 25, above the CRP-24 of the CFP system", () => {
			expect(isValidRegistroProfissional({ value: "25/12345", council: "CRP" })).toBe(false);
		});

		test("when a CRP regional code is 99, which no Conselho Regional carries", () => {
			expect(isValidRegistroProfissional({ value: "99/12345", council: "CRP" })).toBe(false);
		});
	});

	describe("should return true", () => {
		test("for a valid OAB number", () => {
			expect(isValidRegistroProfissional({ value: "123456/SP", council: "OAB" })).toBe(true);
		});

		test("for a valid OAB number matching params.stateCode", () => {
			expect(
				isValidRegistroProfissional({ value: "123456-SP", council: "OAB", stateCode: "SP" }),
			).toBe(true);
		});

		test("for a valid CRM number", () => {
			expect(isValidRegistroProfissional({ value: "54321/RJ", council: "CRM" })).toBe(true);
		});

		test("for a valid CRO number", () => {
			expect(isValidRegistroProfissional({ value: "12345/MG", council: "CRO" })).toBe(true);
		});

		test("for a valid CRP number, ignoring params.stateCode", () => {
			expect(
				isValidRegistroProfissional({ value: "06/12345", council: "CRP", stateCode: "SP" }),
			).toBe(true);
		});

		test("for the first regional code of the CFP system, CRP-01", () => {
			expect(isValidRegistroProfissional({ value: "01/12345", council: "CRP" })).toBe(true);
		});

		test("for the last regional code of the CFP system, CRP-24", () => {
			expect(isValidRegistroProfissional({ value: "24/12345", council: "CRP" })).toBe(true);
			expect(isValidRegistroProfissional({ value: "2412345", council: "CRP" })).toBe(true);
		});

		test("for a valid CRC number of a registro originário", () => {
			expect(isValidRegistroProfissional({ value: "SP-123456/O-3", council: "CRC" })).toBe(true);
		});

		test("for DF-000001/P-7, the Manual de Registro's own example of a registro provisório", () => {
			expect(isValidRegistroProfissional({ value: "DF-000001/P-7", council: "CRC" })).toBe(true);
		});

		test("for DF-000002/O-5, the Manual de Registro's own example of a registro originário", () => {
			expect(isValidRegistroProfissional({ value: "DF-000002/O-5", council: "CRC" })).toBe(true);
		});

		test('for "SP-123456/O-3 T-MG", the Manual de Registro\'s own example of a registro definitivo transferido', () => {
			expect(isValidRegistroProfissional({ value: "SP-123456/O-3 T-MG", council: "CRC" })).toBe(
				true,
			);
		});

		test('for "TO-654321/P-8 T-SC", the Manual de Registro\'s own example of a registro provisório transferido', () => {
			expect(isValidRegistroProfissional({ value: "TO-654321/P-8 T-SC", council: "CRC" })).toBe(
				true,
			);
		});

		test('for "PI-111222/O-5 S-AC", the Manual de Registro\'s own example of a registro secundário', () => {
			expect(isValidRegistroProfissional({ value: "PI-111222/O-5 S-AC", council: "CRC" })).toBe(
				true,
			);
		});

		test("for a transferred CRC number matching params.stateCode, which is the originating UF", () => {
			expect(
				isValidRegistroProfissional({
					value: "SP-123456/O-3 T-MG",
					council: "CRC",
					stateCode: "SP",
				}),
			).toBe(true);
			expect(
				isValidRegistroProfissional({
					value: "SP-123456/O-3 T-MG",
					council: "CRC",
					stateCode: "MG",
				}),
			).toBe(false);
		});
	});

	describe("properties", () => {
		const states = fc.constantFrom(...STATE_CODES);

		const numbers = fc.integer({ min: 1000, max: 999_999 });

		test("should accept a well-formed number for every council", () => {
			fc.assert(
				fc.property(states, numbers, (stateCode, number) => {
					for (const council of ["OAB", "CRM", "CRO"] as const) {
						expect(isValidRegistroProfissional({ value: `${number}/${stateCode}`, council })).toBe(
							true,
						);
						expect(
							isValidRegistroProfissional({ value: `${number}-${stateCode}`, council, stateCode }),
						).toBe(true);
					}

					expect(isValidRegistroProfissional({ value: `06/${number}`, council: "CRP" })).toBe(true);
					expect(
						isValidRegistroProfissional({
							value: `${stateCode}-${String(number).padStart(6, "0")}/O-3`,
							council: "CRC",
						}),
					).toBe(true);
				}),
			);
		});

		test("should accept a CRP registration only for the 24 regionals of the CFP system", () => {
			fc.assert(
				fc.property(fc.integer({ min: 0, max: 99 }), numbers, (region, number) => {
					const value = `${String(region).padStart(2, "0")}/${number}`;
					const expected = region >= 1 && region <= 24;

					expect(isValidRegistroProfissional({ value, council: "CRP" })).toBe(expected);
				}),
			);
		});

		test("should accept a CRC registration only with six digits of ordem", () => {
			fc.assert(
				fc.property(
					states,
					fc.integer({ min: 1, max: 9_999_999 }),
					fc.constantFrom("O", "P"),
					(stateCode, number, category) => {
						const digits = String(number);
						const value = `${stateCode}-${digits}/${category}-3`;

						expect(isValidRegistroProfissional({ value, council: "CRC" })).toBe(
							digits.length === 6,
						);
					},
				),
			);
		});

		test('should accept the "T" and "S" suffixes only after the check digit and only with a real destination UF', () => {
			fc.assert(
				fc.property(
					states,
					states,
					fc.constantFrom("O", "P"),
					(stateCode, destination, category) => {
						const number = `${stateCode}-123456/${category}-3`;

						for (const suffix of ["T", "S"]) {
							expect(
								isValidRegistroProfissional({
									value: `${number} ${suffix}-${destination}`,
									council: "CRC",
								}),
							).toBe(true);
							expect(
								isValidRegistroProfissional({
									value: `${stateCode}-123456/${suffix}-3`,
									council: "CRC",
								}),
							).toBe(false);
						}
					},
				),
			);
		});

		test("should reject a registration whose UF is not the expected one", () => {
			fc.assert(
				fc.property(states, states, numbers, (stateCode, other, number) => {
					fc.pre(stateCode !== other);

					const value = `${number}/${other}`;

					expect(isValidRegistroProfissional({ value, council: "OAB", stateCode })).toBe(false);
				}),
			);
		});

		test("should reject a number that carries no UF at all", () => {
			fc.assert(
				fc.property(numbers, (number) => {
					expect(isValidRegistroProfissional({ value: `${number}`, council: "CRM" })).toBe(false);
				}),
			);
		});

		test("should never throw and always judge a registration with a boolean", () => {
			fc.assert(
				fc.property(fc.anything(), (params) => {
					const result = isValidRegistroProfissional(params as IsValidRegistroProfissionalOptions);

					expect(typeof result).toBe("boolean");
				}),
			);
		});
	});
});

describe("isValidRegistroProfissional types", () => {
	test("should take a single required object and return a boolean", () => {
		expectTypeOf(isValidRegistroProfissional)
			.parameter(0)
			.toEqualTypeOf<IsValidRegistroProfissionalOptions>();
		expectTypeOf(isValidRegistroProfissional).parameters.toEqualTypeOf<
			[IsValidRegistroProfissionalOptions]
		>();
		expectTypeOf<IsValidRegistroProfissionalOptions["value"]>().toEqualTypeOf<string>();
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
