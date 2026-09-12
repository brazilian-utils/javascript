import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isValidVin } from "./is-valid-vin";

const VIN_CHECK_CHARACTERS = Array.from({ length: 11 }, (_, index) =>
	index === 10 ? "X" : String(index),
);

describe("isValidVin", () => {
	describe("should return true", () => {
		test("for a known valid VIN with a numeric check digit", () => {
			expect(isValidVin("1HGCM82633A004352")).toBe(true);
		});

		test("for a known valid VIN with an X check digit", () => {
			expect(isValidVin("1M8GDM9AXKP042788")).toBe(true);
		});

		test("for a second known valid VIN", () => {
			expect(isValidVin("JH4TB2H26CC000000")).toBe(true);
		});

		test("for a lowercase value", () => {
			expect(isValidVin("1m8gdm9axkp042788")).toBe(true);
		});

		test("for a value with leading/trailing whitespace", () => {
			expect(isValidVin(" 1HGCM82633A004352 ")).toBe(true);
		});
	});

	describe("should return false", () => {
		test("when the check digit does not match", () => {
			expect(isValidVin("1HGCM82633A004353")).toBe(false);
		});

		test("when it contains the excluded letter I", () => {
			expect(isValidVin("1HGCM8263IA004352")).toBe(false);
		});

		test("when the excluded letter I replaces a non-check-digit position that would otherwise still checksum correctly", () => {
			expect(isValidVin("1HICM82633A004352")).toBe(false);
		});

		test("when it contains the excluded letter O", () => {
			expect(isValidVin("1HGCM8263OA004352")).toBe(false);
		});

		test("when it contains the excluded letter Q", () => {
			expect(isValidVin("1HGCM8263QA004352")).toBe(false);
		});

		test("when it has fewer than 17 characters", () => {
			expect(isValidVin("1HGCM82633A00435")).toBe(false);
		});

		test("when it has 16 characters whose weighted sum coincidentally matches its own 9th character", () => {
			expect(isValidVin("Z92D746W7W5N6SFH")).toBe(false);
		});

		test("when it has more than 17 characters", () => {
			expect(isValidVin("1HGCM82633A0043522")).toBe(false);
		});

		test("when the check digit character is a letter other than X", () => {
			expect(isValidVin("1HGCM826C3A004352")).toBe(false);
		});

		test("when it contains a symbol", () => {
			expect(isValidVin("1HGCM82633A00435-")).toBe(false);
		});

		test("when it is an empty string", () => {
			expect(isValidVin("")).toBe(false);
		});

		test("when it is only whitespace", () => {
			expect(isValidVin("                 ")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidVin(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidVin()).toBe(false);
		});

		test("when it is a number", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidVin(12_345_678_901_234)).toBe(false);
		});

		test("when it is a boolean", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidVin(true)).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidVin(false)).toBe(false);
		});

		test("when it is an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidVin({})).toBe(false);
		});

		test("when it is an array", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidVin([])).toBe(false);
		});
	});

	describe("properties", () => {
		const bodies = fc.stringMatching(/^[0-9A-HJ-NPR-Z]{16}$/);

		const vins = fc.stringMatching(/^[0-9A-HJ-NPR-Z]{17}$/);

		test("should accept exactly one check character for any body", () => {
			fc.assert(
				fc.property(bodies, (body) => {
					const candidates = VIN_CHECK_CHARACTERS.map(
						(character) => `${body.slice(0, 8)}${character}${body.slice(8)}`,
					);
					const accepted = candidates.filter((candidate) => isValidVin(candidate));

					expect(accepted.length).toBe(1);
				}),
			);
		});

		test("should ignore the case and the surrounding whitespace", () => {
			fc.assert(
				fc.property(vins, (vin) => {
					expect(isValidVin(` ${vin.toLowerCase()} `)).toBe(isValidVin(vin));
				}),
			);
		});

		test("should reject a chassis containing the excluded letters", () => {
			fc.assert(
				fc.property(
					vins,
					fc.integer({ min: 0, max: 16 }),
					fc.constantFrom("I", "O", "Q"),
					(vin, index, letter) => {
						expect(isValidVin(`${vin.slice(0, index)}${letter}${vin.slice(index + 1)}`)).toBe(
							false,
						);
					},
				),
			);
		});

		test("should never throw and always judge a chassis with a boolean", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					expect(typeof isValidVin(value as string)).toBe("boolean");
				}),
			);
		});
	});
});

describe("isValidVin types", () => {
	test("should take a string and return a boolean", () => {
		expectTypeOf(isValidVin).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(isValidVin).returns.toEqualTypeOf<boolean>();
	});
});
