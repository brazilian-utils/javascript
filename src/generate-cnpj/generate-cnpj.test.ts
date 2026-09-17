import * as fc from "fast-check";

import { CNPJ_LENGTH } from "../_internals/constants/cnpj";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isValidCnpj } from "../is-valid-cnpj/is-valid-cnpj";
import { type GenerateCnpjParams, generateCnpj } from "./generate-cnpj";

const REMAINDER_TWO_DRAWS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];

const BRANCH_FALLBACK_DRAWS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2];

const INVALID_BRANCHES: [string, number][] = [
	["0, below the first ordem", 0],
	["10000, past the last ordem", 10_000],
	["1.5, not an integer", 1.5],
	["-1, a negative ordem", -1],
	["NaN", Number.NaN],
];

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

		test("should generate a valid numeric CNPJ when the version is null", () => {
			// @ts-expect-error: intentionally invalid input
			const cnpj = generateCnpj(null);

			expect(cnpj).toHaveLength(CNPJ_LENGTH);
			expect(/^\d+$/.test(cnpj)).toBe(true);
			expect(isValidCnpj(cnpj)).toBe(true);
		});

		test("should generate a valid numeric CNPJ when the version is not a known version", () => {
			// @ts-expect-error: intentionally invalid input
			const cnpj = generateCnpj("2");

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

	describe("options object", () => {
		test("should generate a numeric CNPJ for an empty options object", () => {
			const cnpj = generateCnpj({});

			expect(cnpj).toHaveLength(CNPJ_LENGTH);
			expect(/^\d+$/.test(cnpj)).toBe(true);
			expect(isValidCnpj(cnpj)).toBe(true);
		});

		test("should write the branch as the ordem block in positions 9 to 12", () => {
			const cnpj = generateCnpj({ branch: 1 });

			expect(cnpj.slice(8, 12)).toBe("0001");
			expect(isValidCnpj(cnpj)).toBe(true);
		});

		test("should zero pad a branch shorter than the four character ordem block", () => {
			expect(generateCnpj({ branch: 3 }).slice(8, 12)).toBe("0003");
			expect(generateCnpj({ branch: 42 }).slice(8, 12)).toBe("0042");
			expect(generateCnpj({ branch: 500 }).slice(8, 12)).toBe("0500");
		});

		test("should keep the ordem block numeric on the alphanumeric version, with letters in the raiz", () => {
			const raizChars = new Set<string>();

			for (let index = 0; index < 100; index++) {
				const cnpj = generateCnpj({ version: 2, branch: 9999 });

				expect(cnpj).toHaveLength(CNPJ_LENGTH);
				expect(cnpj.slice(8, 12)).toBe("9999");
				expect(isValidCnpj(cnpj, { version: 2 })).toBe(true);

				for (const char of cnpj.slice(0, 8)) {
					raizChars.add(char);
				}
			}

			expect([...raizChars].some((char) => /[A-Z]/.test(char))).toBe(true);
		});

		test("should generate a numeric CNPJ with a branch when the version is 1", () => {
			const cnpj = generateCnpj({ version: 1, branch: 1234 });

			expect(/^\d+$/.test(cnpj)).toBe(true);
			expect(cnpj.slice(8, 12)).toBe("1234");
			expect(isValidCnpj(cnpj)).toBe(true);
		});

		for (const [label, branch] of INVALID_BRANCHES) {
			test(`should draw a random ordem block when the branch is ${label}`, () => {
				const cnpj = generateWithForcedDraws(BRANCH_FALLBACK_DRAWS, 10, () =>
					generateCnpj({ branch }),
				);

				expect(cnpj).toBe("12345678901230");
				expect(isValidCnpj(cnpj)).toBe(true);
			});
		}

		test("should draw a random ordem block when the branch is a string", () => {
			const cnpj = generateWithForcedDraws(BRANCH_FALLBACK_DRAWS, 10, () =>
				// @ts-expect-error: intentionally invalid input
				generateCnpj({ branch: "3" }),
			);

			expect(cnpj).toBe("12345678901230");
		});

		test("should draw a random ordem block when the branch is null", () => {
			const cnpj = generateWithForcedDraws(BRANCH_FALLBACK_DRAWS, 10, () =>
				// @ts-expect-error: intentionally invalid input
				generateCnpj({ branch: null }),
			);

			expect(cnpj).toBe("12345678901230");
		});

		test("should ignore an unknown version in the options object and generate a numeric CNPJ", () => {
			// @ts-expect-error: intentionally invalid input
			const cnpj = generateCnpj({ version: 3 });

			expect(/^\d+$/.test(cnpj)).toBe(true);
			expect(isValidCnpj(cnpj)).toBe(true);
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

		test("should write any ordem from 1 to 9999 into positions 9 to 12 of both versions", () => {
			fc.assert(
				fc.property(fc.integer({ min: 1, max: 9999 }), (branch) => {
					const padded = `000${branch}`.slice(-4);

					expect(generateCnpj({ branch }).slice(8, 12)).toBe(padded);
					expect(generateCnpj({ version: 2, branch }).slice(8, 12)).toBe(padded);
				}),
			);
		});
	});
});

describe("generateCnpj types", () => {
	test("should take an optional version or options object and return a string", () => {
		expectTypeOf(generateCnpj).parameter(0).toEqualTypeOf<1 | 2 | GenerateCnpjParams | undefined>();
		expectTypeOf(generateCnpj).returns.toEqualTypeOf<string>();
	});

	test("should take an optional version and branch in the options object", () => {
		expectTypeOf<GenerateCnpjParams["version"]>().toEqualTypeOf<1 | 2 | undefined>();
		expectTypeOf<GenerateCnpjParams["branch"]>().toEqualTypeOf<number | undefined>();
	});
});
