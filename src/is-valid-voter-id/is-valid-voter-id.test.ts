import { describe, expect, it } from "../_internals/test/runtime";
import { generateVoterId } from "../generate-voter-id/generate-voter-id";
import { isValidVoterId } from "./is-valid-voter-id";

describe("isValidVoterId", () => {
	it("should validate voter ids", () => {
		const voterId = generateVoterId("SP");
		expect(isValidVoterId(voterId)).toBe(true);
		expect(isValidVoterId(`${voterId.slice(0, -1)}${voterId.endsWith("0") ? "1" : "0"}`)).toBe(
			false,
		);
	});

	it("should validate a real 12-digit voter id", () => {
		expect(isValidVoterId("102385010671")).toBe(true);
	});

	it("should validate a real 13-digit voter id (São Paulo, 9-digit sequential)", () => {
		expect(isValidVoterId("1234567880191")).toBe(true);
	});

	it("should ignore the ninth sequential digit when checking a 13-digit voter id, as brutils does", () => {
		const variants = [
			"1234567800191",
			"1234567810191",
			"1234567820191",
			"1234567830191",
			"1234567840191",
			"1234567850191",
			"1234567860191",
			"1234567870191",
			"1234567880191",
			"1234567890191",
		];

		for (const variant of variants) {
			expect(isValidVoterId(variant)).toBe(true);
		}

		expect(isValidVoterId("1234567880192")).toBe(false);
	});

	it("should reject a 13-digit value whose UF cannot carry a 9-digit sequential number", () => {
		expect(isValidVoterId("1234567890396")).toBe(false);
		expect(isValidVoterId("123456780396")).toBe(true);
	});

	it("should reject a value with more than 13 digits even when the first 8 and the last 4 match", () => {
		expect(isValidVoterId("12345678980191")).toBe(false);
		expect(isValidVoterId("1234567880191")).toBe(true);
	});

	it("should return false when the UF code is outside 01-28", () => {
		expect(isValidVoterId("123456789900")).toBe(false);
	});

	it("should return false for a 13-digit voter id whose UF is not 01 or 02", () => {
		expect(isValidVoterId("1234567890345")).toBe(false);
	});

	it("should return false for null, undefined, a number or an empty string", () => {
		// @ts-expect-error: intentionally invalid input
		expect(isValidVoterId(null)).toBe(false);
		// @ts-expect-error: intentionally invalid input
		expect(isValidVoterId()).toBe(false);
		// @ts-expect-error: intentionally invalid input
		expect(isValidVoterId(123_456_780_124)).toBe(false);
		expect(isValidVoterId("")).toBe(false);
	});

	it("should reject a valid voter id passed as a number instead of a string", () => {
		// @ts-expect-error: intentionally invalid input
		expect(isValidVoterId(102_385_010_671)).toBe(false);
	});

	it("should reject a value whose length is neither 12 nor 13, even when its checksum would otherwise match", () => {
		expect(isValidVoterId("000010191")).toBe(false);
		expect(isValidVoterId("1234567890370")).toBe(false);
	});

	it("should reject the UF code boundaries 0 and 29, even when the checksum would otherwise match", () => {
		expect(isValidVoterId("000000000000")).toBe(false);
		expect(isValidVoterId("000000002909")).toBe(false);
	});

	it("should accept the UF code boundaries 1 and 28", () => {
		expect(isValidVoterId("000000010191")).toBe(true);
		expect(isValidVoterId("000000002801")).toBe(true);
	});
});
