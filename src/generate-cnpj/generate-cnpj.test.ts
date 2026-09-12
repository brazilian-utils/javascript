import * as fc from "fast-check";

import { CNPJ_LENGTH } from "../_internals/constants/cnpj";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isValidCnpj } from "../is-valid-cnpj/is-valid-cnpj";
import { generateCnpj } from "./generate-cnpj";

describe("generateCnpj", () => {
	describe("version 1 (numeric)", () => {
		test("should generate a valid numeric CNPJ", () => {
			const cnpj = generateCnpj(1);
			expect(cnpj).toHaveLength(CNPJ_LENGTH);
			expect(/^\d+$/.test(cnpj)).toBe(true);
			expect(isValidCnpj(cnpj)).toBe(true);
		});

		test("should generate a valid numeric CNPJ by default", () => {
			const cnpj = generateCnpj();
			expect(cnpj).toHaveLength(CNPJ_LENGTH);
			expect(/^\d+$/.test(cnpj)).toBe(true);
			expect(isValidCnpj(cnpj)).toBe(true);
		});

		test("should regenerate the base when it comes out with repeated digits", () => {
			const digits = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2];
			const originalRandom = Math.random;
			let call = 0;

			Math.random = () => {
				const digit = digits[call];
				call += 1;
				return (digit + 0.5) / 10;
			};

			try {
				const cnpj = generateCnpj(1);

				expect(cnpj.slice(0, 12)).toBe("123456789012");
				expect(isValidCnpj(cnpj)).toBe(true);
			} finally {
				Math.random = originalRandom;
			}
		});

		test("should generate different numeric CNPJs on multiple calls, retrying more draws on the rare chance of a collision", () => {
			const cnpj1 = generateCnpj(1);
			const cnpj2 = generateCnpj(1);
			const cnpj3 = generateCnpj(1);

			const allSame = cnpj1 === cnpj2 && cnpj2 === cnpj3;
			if (allSame) {
				const set = new Set([cnpj1, generateCnpj(1), generateCnpj(1)]);
				expect(set.size).toBeGreaterThan(1);
			}
		});

		test("should generate valid numeric CNPJs that pass validation with formatting", () => {
			for (let i = 0; i < 10; i++) {
				const cnpj = generateCnpj(1);
				const formatted = `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
				expect(isValidCnpj(formatted)).toBe(true);
			}
		});
	});

	describe("version 2 (alphanumeric)", () => {
		test("should generate a valid alphanumeric CNPJ", () => {
			const cnpj = generateCnpj(2);
			expect(cnpj).toHaveLength(CNPJ_LENGTH);
			expect(/^[0-9A-Z]+$/.test(cnpj)).toBe(true);
			expect(isValidCnpj(cnpj, { version: 2 })).toBe(true);
		});

		test("should generate different alphanumeric CNPJs on multiple calls, retrying more draws on the rare chance of a collision", () => {
			const cnpj1 = generateCnpj(2);
			const cnpj2 = generateCnpj(2);
			const cnpj3 = generateCnpj(2);

			const allSame = cnpj1 === cnpj2 && cnpj2 === cnpj3;
			if (allSame) {
				const set = new Set([cnpj1, generateCnpj(2), generateCnpj(2)]);
				expect(set.size).toBeGreaterThan(1);
			}
		});

		test("should generate valid alphanumeric CNPJs that pass validation with formatting", () => {
			for (let i = 0; i < 10; i++) {
				const cnpj = generateCnpj(2);
				const formatted = `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
				expect(isValidCnpj(formatted, { version: 2 })).toBe(true);
			}
		});

		test("should generate alphanumeric CNPJs including E, O, T and U, which a previously restricted alphabet excluded even though isValidCnpj accepts them (the official RFB example '12.ABC.345/01DE-35' contains an E)", () => {
			const usedChars = new Set<string>();
			for (let i = 0; i < 1000; i++) {
				for (const char of generateCnpj(2)) {
					usedChars.add(char);
				}
			}
			for (const char of ["E", "O", "T", "U"]) {
				expect(usedChars.has(char)).toBe(true);
			}
		});
	});

	describe("properties", () => {
		const batchSize = fc.integer({ min: 1, max: 10 });

		test("should generate numeric CNPJs both versions accept", () => {
			fc.assert(
				fc.property(batchSize, (size) => {
					for (let index = 0; index < size; index++) {
						const cnpj = generateCnpj(1);

						expect(cnpj).toMatch(/^\d{14}$/);
						expect(isValidCnpj(cnpj)).toBe(true);
						expect(isValidCnpj(cnpj, { version: 2 })).toBe(true);
					}
				}),
			);
		});

		test("should generate alphanumeric CNPJs with numeric check digits", () => {
			fc.assert(
				fc.property(batchSize, (size) => {
					for (let index = 0; index < size; index++) {
						const cnpj = generateCnpj(2);

						expect(cnpj).toHaveLength(CNPJ_LENGTH);
						expect(cnpj).toMatch(/^[0-9A-Z]{12}\d{2}$/);
						expect(isValidCnpj(cnpj, { version: 2 })).toBe(true);
					}
				}),
			);
		});
	});
});

describe("generateCnpj types", () => {
	test("should take an optional version and return a string", () => {
		expectTypeOf(generateCnpj).parameter(0).toEqualTypeOf<1 | 2 | undefined>();
		expectTypeOf(generateCnpj).returns.toEqualTypeOf<string>();
	});
});
