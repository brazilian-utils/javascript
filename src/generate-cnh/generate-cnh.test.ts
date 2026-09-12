import { calculateCnhFirstVerifier } from "../_internals/calculate-cnh-first-verifier/calculate-cnh-first-verifier";
import { calculateCnhSecondVerifier } from "../_internals/calculate-cnh-second-verifier/calculate-cnh-second-verifier";
import { describe, expect, it } from "../_internals/test/runtime";
import { isValidCnh } from "../is-valid-cnh/is-valid-cnh";
import { generateCnh } from "./generate-cnh";

const runWithRepeatedDigitsForcingRandom = (run: () => void) => {
	const forcedDigitSequence = [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
	const originalRandom = Math.random;

	let nextDigitIndex = 0;

	Math.random = () => (forcedDigitSequence[nextDigitIndex++] + 0.5) / 10;

	try {
		run();
	} finally {
		Math.random = originalRandom;
	}
};

describe("generateCnh", () => {
	it("should generate valid CNH values", () => {
		for (let i = 0; i < 200; i++) {
			expect(isValidCnh(generateCnh())).toBe(true);
		}
	});

	it("should cover the secondVerifier<0 branch with a known base", () => {
		const base = "000000093";
		const { firstVerifier, decrement } = calculateCnhFirstVerifier(base);
		const secondVerifier = calculateCnhSecondVerifier({ base, decrement });

		expect(decrement).toBe(2);
		expect(secondVerifier).toBe(9);
		expect(isValidCnh(`${base}${firstVerifier}${secondVerifier}`)).toBe(true);
	});

	it("should regenerate the base when it comes out with repeated digits", () => {
		runWithRepeatedDigitsForcingRandom(() => {
			const cnh = generateCnh();

			expect(cnh.slice(0, 9)).toBe("123456789");
			expect(isValidCnh(cnh)).toBe(true);
		});
	});
});
