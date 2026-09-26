import * as fc from "fast-check";

import { CPF_FISCAL_REGION_BY_STATE, CPF_LENGTH } from "../_internals/constants/cpf";
import { DATA, type StateCode } from "../_internals/constants/states";
import { PROTOTYPE_KEYS } from "../_internals/test/arbitraries";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isValidCpf } from "../is-valid-cpf/is-valid-cpf";
import { generateCpf } from "./generate-cpf";

describe("generateCpf", () => {
	test(`should have the right length without mask (${CPF_LENGTH})`, () => {
		expect(generateCpf().length).toBe(CPF_LENGTH);
	});

	test("should return valid CPF", () => {
		for (let i = 0; i < 100; i++) {
			expect(isValidCpf(generateCpf())).toBe(true);
		}
	});

	test("should regenerate the base when it comes out with repeated digits", () => {
		const digits = [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
		const originalRandom = Math.random;
		let call = 0;

		Math.random = () => {
			const digit = digits[call];
			call += 1;
			return (digit + 0.5) / 10;
		};

		try {
			const cpf = generateCpf();

			expect(cpf.slice(0, 9)).toBe("123456789");
			expect(isValidCpf(cpf)).toBe(true);
		} finally {
			Math.random = originalRandom;
		}
	});

	describe("should return a valid CPF for each brazilian state with initials", () => {
		for (const state of DATA) {
			test(state.code, () => {
				const cpf = generateCpf(state.code);
				expect(isValidCpf(cpf)).toBe(true);
				expect(cpf.length).toBe(CPF_LENGTH);
			});
		}
	});

	test("should embed the literal CPF_FISCAL_REGION_BY_STATE digit at the 9th position, not a random one", () => {
		for (let i = 0; i < 20; i++) {
			expect(generateCpf("SP")[8]).toBe(CPF_FISCAL_REGION_BY_STATE.SP);
		}
	});

	test("should embed the 1st região fiscal digit for the states the Receita Federal groups there", () => {
		expect(CPF_FISCAL_REGION_BY_STATE.MS).toBe("1");
		expect(CPF_FISCAL_REGION_BY_STATE.MT).toBe("1");
		expect(generateCpf("MS")[8]).toBe("1");
		expect(generateCpf("MT")[8]).toBe("1");
	});

	test("should fall back to a random digit instead of looking up an unknown state code", () => {
		// @ts-expect-error: intentionally invalid input
		const cpf = generateCpf("XX");
		expect(cpf).toHaveLength(CPF_LENGTH);
		expect(isValidCpf(cpf)).toBe(true);
	});

	test("should fall back to a random digit instead of reaching the prototype chain for a state code", () => {
		for (const key of PROTOTYPE_KEYS) {
			// @ts-expect-error: intentionally invalid input
			const cpf = generateCpf(key);
			expect(cpf).toHaveLength(CPF_LENGTH);
			expect(isValidCpf(cpf)).toBe(true);
		}
	});

	test("should fall back to a random digit instead of throwing for a state code with no string conversion", () => {
		const nullPrototype = generateCpf(Object.create(null));
		const throwing = generateCpf({
			toString() {
				throw new Error("no string conversion");
			},
		} as unknown as StateCode);

		expect(isValidCpf(nullPrototype)).toBe(true);
		expect(isValidCpf(throwing)).toBe(true);
	});

	describe("properties", () => {
		const stateCode = fc.constantFrom(...DATA.map((state) => state.code));
		const batchSize = fc.integer({ min: 1, max: 10 });
		const hostileStateCode = fc.oneof(fc.constantFrom(...PROTOTYPE_KEYS), fc.anything());

		test("should generate a valid CPF carrying the state digit of every state", () => {
			fc.assert(
				fc.property(stateCode, (state) => {
					const cpf = generateCpf(state);

					expect(cpf).toHaveLength(CPF_LENGTH);
					expect(cpf[8]).toBe(CPF_FISCAL_REGION_BY_STATE[state]);
					expect(isValidCpf(cpf)).toBe(true);
				}),
			);
		});

		test("should generate a valid CPF for any state code at all, prototype chain keys included", () => {
			fc.assert(
				fc.property(hostileStateCode, (state) => {
					const cpf = generateCpf(state as StateCode);

					expect(cpf).toMatch(/^\d{11}$/);
					expect(isValidCpf(cpf)).toBe(true);
				}),
			);
		});

		test("should never draw a base made of a single repeated digit", () => {
			fc.assert(
				fc.property(batchSize, (size) => {
					for (let index = 0; index < size; index++) {
						const cpf = generateCpf();

						expect(cpf).toMatch(/^\d{11}$/);
						expect(/^(\d)\1{8}/.test(cpf)).toBe(false);
						expect(isValidCpf(cpf)).toBe(true);
					}
				}),
			);
		});
	});
});

describe("generateCpf types", () => {
	test("should take an optional state code and return a string", () => {
		expectTypeOf(generateCpf).parameter(0).toEqualTypeOf<StateCode | undefined>();
		expectTypeOf(generateCpf).returns.toEqualTypeOf<string>();
	});
});
