import { describe, expect, it } from "../_internals/test/runtime";
import { isValidLegalNature } from "../is-valid-legal-nature/is-valid-legal-nature";
import { generateLegalNature } from "./generate-legal-nature";

describe("generateLegalNature", () => {
	it("should generate valid legal nature values", () => {
		for (let i = 0; i < 50; i++) {
			expect(isValidLegalNature(generateLegalNature())).toBe(true);
		}
	});

	it("should map a forced random value to the hand-computed code at that index, not always the first entry", () => {
		const originalRandom = Math.random;

		Math.random = () => 0.5;

		try {
			expect(generateLegalNature()).toBe("2216");
		} finally {
			Math.random = originalRandom;
		}
	});
});
