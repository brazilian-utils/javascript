import { describe, expect, test } from "../_internals/test/runtime";
import { isValidCnpj } from "../is-valid-cnpj/is-valid-cnpj";
import { LENGTH } from "./constants";
import { generateCnpj } from "./generate-cnpj";

describe("generateCnpj", () => {
	describe("version 1 (numeric)", () => {
		test("should generate a valid numeric CNPJ", () => {
			const cnpj = generateCnpj(1);
			expect(cnpj).toHaveLength(LENGTH);
			expect(/^\d+$/.test(cnpj)).toBe(true);
			expect(isValidCnpj(cnpj)).toBe(true);
		});

		test("should generate a valid numeric CNPJ by default", () => {
			const cnpj = generateCnpj();
			expect(cnpj).toHaveLength(LENGTH);
			expect(/^\d+$/.test(cnpj)).toBe(true);
			expect(isValidCnpj(cnpj)).toBe(true);
		});

		test("should generate different numeric CNPJs on multiple calls", () => {
			const cnpj1 = generateCnpj(1);
			const cnpj2 = generateCnpj(1);
			const cnpj3 = generateCnpj(1);

			// Very unlikely but possible to generate same CNPJ
			const allSame = cnpj1 === cnpj2 && cnpj2 === cnpj3;
			if (allSame) {
				// If all same, generate more to verify randomness
				const set = new Set([cnpj1, generateCnpj(1), generateCnpj(1)]);
				expect(set.size).toBeGreaterThan(1);
			}
		});

		test("should generate valid numeric CNPJs that pass validation with formatting", () => {
			for (let i = 0; i < 10; i++) {
				const cnpj = generateCnpj(1);
				// Add formatting and validate
				const formatted = `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
				expect(isValidCnpj(formatted)).toBe(true);
			}
		});
	});

	describe("version 2 (alphanumeric)", () => {
		test("should generate a valid alphanumeric CNPJ", () => {
			const cnpj = generateCnpj(2);
			expect(cnpj).toHaveLength(LENGTH);
			expect(/^[0-9A-Z]+$/.test(cnpj)).toBe(true);
			expect(isValidCnpj(cnpj, { version: 2 })).toBe(true);
		});

		test("should generate different alphanumeric CNPJs on multiple calls", () => {
			const cnpj1 = generateCnpj(2);
			const cnpj2 = generateCnpj(2);
			const cnpj3 = generateCnpj(2);

			// Very unlikely but possible to generate same CNPJ
			const allSame = cnpj1 === cnpj2 && cnpj2 === cnpj3;
			if (allSame) {
				// If all same, generate more to verify randomness
				const set = new Set([cnpj1, generateCnpj(2), generateCnpj(2)]);
				expect(set.size).toBeGreaterThan(1);
			}
		});

		test("should generate valid alphanumeric CNPJs that pass validation with formatting", () => {
			for (let i = 0; i < 10; i++) {
				const cnpj = generateCnpj(2);
				// Add formatting and validate
				const formatted = `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
				expect(isValidCnpj(formatted, { version: 2 })).toBe(true);
			}
		});

		test("should generate alphanumeric CNPJs spanning the full A-Z alphabet", () => {
			const usedChars = new Set<string>();
			for (let i = 0; i < 1000; i++) {
				for (const char of generateCnpj(2)) {
					usedChars.add(char);
				}
			}
			// E, O, T and U were previously excluded by a restricted alphabet, even
			// though isValidCnpj accepts them: the RFB alphanumeric CNPJ uses the full
			// [A-Z0-9] base (official example "12.ABC.345/01DE-35" contains an "E").
			for (const char of ["E", "O", "T", "U"]) {
				expect(usedChars.has(char)).toBe(true);
			}
		});
	});
});
