import { describe, expect, test } from "../test/runtime";
import { calculateCnhSecondVerifier } from "./calculate-cnh-second-verifier";

describe("calculateCnhSecondVerifier", () => {
	test("should calculate the second verifier", () => {
		expect(calculateCnhSecondVerifier({ base: "000000001", decrement: 0 })).toBe(9);
	});

	test("should wrap around when the decrement makes the result negative", () => {
		expect(calculateCnhSecondVerifier({ base: "000000093", decrement: 2 })).toBe(9);
	});
});
