import { describe, expect, test } from "../test/runtime";
import { calculateVoterIdFirstDigit } from "./calculate-voter-id-first-digit";

describe("calculateVoterIdFirstDigit", () => {
	test("should calculate the first digit for an 8-digit sequential number", () => {
		expect(
			calculateVoterIdFirstDigit({ sequentialNumber: "10238501", federativeUnion: "06" }),
		).toBe(7);
	});

	test("should calculate the first digit over the 8 sequential digits (SP)", () => {
		// 1·2 + 2·3 + 3·4 + 4·5 + 5·6 + 6·7 + 7·8 + 8·9 = 240, 240 mod 11 = 9
		expect(
			calculateVoterIdFirstDigit({ sequentialNumber: "12345678", federativeUnion: "01" }),
		).toBe(9);
	});

	test("should weigh the leading zeros of the sequential number as zeros", () => {
		// 1·5 + 2·6 + 3·7 + 4·8 + 5·9 = 115, 115 mod 11 = 5
		expect(
			calculateVoterIdFirstDigit({ sequentialNumber: "00012345", federativeUnion: "01" }),
		).toBe(5);
	});

	test("should apply the SP/MG rule when the remainder is 0", () => {
		expect(
			calculateVoterIdFirstDigit({ sequentialNumber: "00000000", federativeUnion: "01" }),
		).toBe(1);
	});
});
