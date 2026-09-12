import { CNPJ_LENGTH } from "../_internals/constants/cnpj";
import { describe, expect, test } from "../_internals/test/runtime";
import { isValidCnpj } from "../is-valid-cnpj/is-valid-cnpj";
import { generateCnpj } from "./generate-cnpj";

const REMAINDER_TWO_DRAWS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];

const generateWithForcedDraws = (
	draws: number[],
	alphabetSize: number,
	generate: () => string,
): string => {
	const originalRandom = Math.random;
	let call = 0;

	Math.random = () => {
		const draw = draws[call];
		call += 1;
		return (draw + 0.5) / alphabetSize;
	};

	try {
		return generate();
	} finally {
		Math.random = originalRandom;
	}
};

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

			Math.random = () => (digits[call++] + 0.5) / 10;

			try {
				const cnpj = generateCnpj(1);

				expect(cnpj.slice(0, 12)).toBe("123456789012");
				expect(isValidCnpj(cnpj)).toBe(true);
			} finally {
				Math.random = originalRandom;
			}
		});

		test("should compute the first check digit as 9 when the weighted sum leaves remainder 2", () => {
			const cnpj = generateWithForcedDraws(REMAINDER_TWO_DRAWS, 10, () => generateCnpj(1));

			expect(cnpj).toBe("00000000000191");
			expect(isValidCnpj(cnpj)).toBe(true);
		});

		test("should compute the alphanumeric check digits the same way when the remainder is 2", () => {
			const cnpj = generateWithForcedDraws(REMAINDER_TWO_DRAWS, 36, () => generateCnpj(2));

			expect(cnpj).toBe("00000000000191");
			expect(isValidCnpj(cnpj, { version: 2 })).toBe(true);
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
});
