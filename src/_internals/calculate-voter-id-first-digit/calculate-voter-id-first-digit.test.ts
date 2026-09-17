import { describe, expect, test } from "../test/runtime";
import { calculateVoterIdFirstDigit } from "./calculate-voter-id-first-digit";

describe("calculateVoterIdFirstDigit", () => {
	test("should calculate the first digit for an 8-digit sequential number", () => {
		expect(
			calculateVoterIdFirstDigit({ sequentialNumber: "10238501", federativeUnion: "06" }),
		).toBe(7);
	});

	test("should calculate the first digit for a 9-digit sequential number (SP)", () => {
		expect(
			calculateVoterIdFirstDigit({ sequentialNumber: "123456788", federativeUnion: "01" }),
		).toBe(9);
	});

	test("should ignore the ninth sequential digit", () => {
		expect(
			calculateVoterIdFirstDigit({ sequentialNumber: "123456780", federativeUnion: "01" }),
		).toBe(9);
		expect(
			calculateVoterIdFirstDigit({ sequentialNumber: "123456783", federativeUnion: "01" }),
		).toBe(9);
	});

	test("should apply the SP/MG rule when the remainder is 0", () => {
		expect(
			calculateVoterIdFirstDigit({ sequentialNumber: "00000000", federativeUnion: "01" }),
		).toBe(1);
	});
});
