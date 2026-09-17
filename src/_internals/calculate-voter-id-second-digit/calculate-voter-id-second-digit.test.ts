import { describe, expect, test } from "../test/runtime";
import { calculateVoterIdSecondDigit } from "./calculate-voter-id-second-digit";

describe("calculateVoterIdSecondDigit", () => {
	test("should calculate the second digit", () => {
		expect(calculateVoterIdSecondDigit({ federativeUnion: "06", firstDigit: 7 })).toBe(1);
	});

	test("should apply the SP/MG rule when the remainder is 0", () => {
		expect(calculateVoterIdSecondDigit({ federativeUnion: "01", firstDigit: 4 })).toBe(1);
	});

	test("should NOT apply the SP/MG rule when the remainder is 0 but the union is not SP/MG", () => {
		expect(calculateVoterIdSecondDigit({ federativeUnion: "06", firstDigit: 2 })).toBe(0);
	});

	test("should NOT apply the SP/MG rule when the union is SP/MG but the remainder is not 0", () => {
		expect(calculateVoterIdSecondDigit({ federativeUnion: "01", firstDigit: 7 })).toBe(5);
	});
});
