import { describe, expect, test } from "../_internals/test/runtime";
import { isValidPassport } from "../is-valid-passport/is-valid-passport";
import { generatePassport } from "./generate-passport";

describe("generatePassport", () => {
	test("should always generate a valid passport", () => {
		for (let i = 0; i < 100; i++) {
			expect(isValidPassport(generatePassport())).toBe(true);
		}
	});

	test("should map a forced random value to the hand-computed letters and digits", () => {
		const originalRandom = Math.random;

		Math.random = () => 0.5;

		try {
			expect(generatePassport()).toBe("NN555555");
		} finally {
			Math.random = originalRandom;
		}
	});
});
