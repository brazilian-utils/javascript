import { describe, expect, test } from "../test/runtime";
import { generateRandomNumber } from "./generate-random-number";

describe("generateRandomNumber", () => {
	test("should generate a string of the correct length", () => {
		expect(generateRandomNumber(1).length).toBe(1);
		expect(generateRandomNumber(5).length).toBe(5);
		expect(generateRandomNumber(10).length).toBe(10);
		expect(generateRandomNumber(14).length).toBe(14);
	});

	test("should generate only numeric characters", () => {
		for (let i = 0; i < 50; i++) {
			const result = generateRandomNumber(10);
			expect(/^\d+$/.test(result)).toBe(true);
		}
	});

	test("should generate different numbers on multiple calls", () => {
		const results = new Set<string>();
		for (let i = 0; i < 100; i++) {
			results.add(generateRandomNumber(10));
		}
		const allSame = results.size === 1;
		if (allSame) {
			for (let i = 0; i < 100; i++) {
				results.add(generateRandomNumber(10));
			}
			expect(results.size).toBeGreaterThan(1);
		}
	});

	test("should handle zero length", () => {
		expect(generateRandomNumber(0)).toBe("");
	});

	test("should generate numbers within valid range (0-9)", () => {
		for (let i = 0; i < 100; i++) {
			const result = generateRandomNumber(5);
			for (const character of result) {
				const digit = Number.parseInt(character, 10);
				expect(digit).toBeGreaterThanOrEqual(0);
				expect(digit).toBeLessThanOrEqual(9);
			}
		}
	});
});
