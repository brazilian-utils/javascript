import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { type IsValidVinOptions, isValidVin } from "./is-valid-vin";

const VIN_CHECK_CHARACTERS = Array.from({ length: 11 }, (_, index) =>
	index === 10 ? "X" : String(index),
);

describe("isValidVin", () => {
	describe("should return true", () => {
		test("for a Brazilian VIN that carries no 49 CFR 565.15 check digit", () => {
			// 2.4.0 returned false: the check digit of 9BWZZZ377VT004251 would be 2, not 7
			expect(isValidVin("9BWZZZ377VT004251")).toBe(true);
			expect(isValidVin("9BWZZZ377VT004251", { checkDigit: false })).toBe(true);
		});

		test("for a known valid VIN with a numeric check digit", () => {
			expect(isValidVin("1HGCM82633A004352")).toBe(true);
			expect(isValidVin("1HGCM82633A004352", { checkDigit: true })).toBe(true);
		});

		test("for a known valid VIN with an X check digit", () => {
			expect(isValidVin("1M8GDM9AXKP042788")).toBe(true);
			expect(isValidVin("1M8GDM9AXKP042788", { checkDigit: true })).toBe(true);
		});

		test("for a second known valid VIN", () => {
			expect(isValidVin("JH4TB2H26CC000000")).toBe(true);
			expect(isValidVin("JH4TB2H26CC000000", { checkDigit: true })).toBe(true);
		});

		test("for a lowercase value", () => {
			expect(isValidVin("1m8gdm9axkp042788")).toBe(true);
			expect(isValidVin("1m8gdm9axkp042788", { checkDigit: true })).toBe(true);
		});

		test("for a value with leading/trailing whitespace", () => {
			expect(isValidVin(" 1HGCM82633A004352 ")).toBe(true);
		});
	});

	describe("should return false", () => {
		test("when a space or a mask character sits among the 17 characters", () => {
			expect(isValidVin("1HGCM 82633 A004352")).toBe(false);
			expect(isValidVin("1HGCM-82633-A004352")).toBe(false);
			expect(isValidVin("1HGCM 82633A004352", { checkDigit: true })).toBe(false);
			expect(isValidVin("1HGCM82633A0043 2")).toBe(false);
			expect(isValidVin("1HGCM.82633A00435")).toBe(false);
		});

		test("when a non-ASCII letter upper cases into an ASCII one", () => {
			expect(isValidVin("9BWZZZ377VT004ſ51")).toBe(false);
			expect(isValidVin("9BWZZZ377VT0042ß")).toBe(false);
			expect(isValidVin("9BWZZZ377VT00425ß")).toBe(false);
			expect(isValidVin("9BWZZZ377VT004ſ51", { checkDigit: true })).toBe(false);
		});

		test("when the check digit does not match and checkDigit is true", () => {
			expect(isValidVin("1HGCM82633A004353", { checkDigit: true })).toBe(false);
			expect(isValidVin("9BWZZZ377VT004251", { checkDigit: true })).toBe(false);
			// @ts-expect-error: intentionally not a boolean
			expect(isValidVin("1HGCM82633A004353", { checkDigit: 1 })).toBe(false);
			// the Brazilian rule mandates no check digit (2.4.0 returned false here)
			expect(isValidVin("1HGCM82633A004353")).toBe(true);
			// @ts-expect-error: intentionally not a boolean
			expect(isValidVin("1HGCM82633A004353", { checkDigit: 0 })).toBe(true);
		});

		test("when the model year code is U, Z or 0 and checkDigit is true, even with a matching check digit", () => {
			// 1HGCM8263 + U/Z/0 + A004352: 1·8+8·7+7·6+3·5+4·4+8·3+2·2+6·10 = 225 plus the 10th
			// character weighted 9 (U 4 → 36, Z 9 → 81, 0 → 0) and A004352 (1·8+0+0+4·5+3·4+5·3+2·2 = 59)
			// gives 320, 365 and 284, whose remainders 1, 2 and 9 are written in position 9
			expect(isValidVin("1HGCM8261UA004352", { checkDigit: true })).toBe(false);
			expect(isValidVin("1HGCM8262ZA004352", { checkDigit: true })).toBe(false);
			expect(isValidVin("1HGCM82690A004352", { checkDigit: true })).toBe(false);
			expect(isValidVin("1HGCM8261UA004352")).toBe(true);
			expect(isValidVin("1HGCM8262ZA004352")).toBe(true);
			expect(isValidVin("1HGCM82690A004352")).toBe(true);
		});

		test("when every character is the same, even though the check digit matches", () => {
			expect(isValidVin("00000000000000000")).toBe(false);
			expect(isValidVin("55555555555555555")).toBe(false);
			expect(isValidVin("99999999999999999")).toBe(false);
			expect(isValidVin(" 00000000000000000 ")).toBe(false);
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

		test("when the check digit character is a letter other than X and checkDigit is true", () => {
			expect(isValidVin("1HGCM826C3A004352", { checkDigit: true })).toBe(false);
			expect(isValidVin("1HGCM826C3A004352")).toBe(true);
		});

		test("when it contains a symbol", () => {
			expect(isValidVin("1HGCM82633A00435-")).toBe(false);
		});

		test("when a mask character splits it, since a VIN has no printed grouping", () => {
			expect(isValidVin("1HGCM8 2633A004352")).toBe(false);
			expect(isValidVin("1HGCM8-2633A004352")).toBe(false);
			expect(isValidVin("1HGCM8.2633A004352")).toBe(false);
			expect(isValidVin("1HGCM8/2633A004352")).toBe(false);
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

		test("should accept any 17 characters of the ISO 3779 alphabet under the Brazilian rule", () => {
			fc.assert(
				fc.property(vins, (vin) => {
					fc.pre(new Set(vin).size > 1);

					expect(isValidVin(vin)).toBe(true);
				}),
			);
		});

		test("should accept exactly one check character for any body when checkDigit is true", () => {
			fc.assert(
				fc.property(bodies, (body) => {
					// A body of a single repeated character can have its one accepted candidate rejected
					// as a repeated-character VIN, so it is left to the literal tests above.
					fc.pre(new Set(body).size > 1);
					// body[8] lands in position 10, the model year code
					fc.pre(!["U", "Z", "0"].includes(body[8]));

					const candidates = VIN_CHECK_CHARACTERS.map(
						(character) => `${body.slice(0, 8)}${character}${body.slice(8)}`,
					);
					const accepted = candidates.filter((candidate) =>
						isValidVin(candidate, { checkDigit: true }),
					);

					expect(accepted.length).toBe(1);
				}),
			);
		});

		test("should ignore the case and the surrounding whitespace", () => {
			fc.assert(
				fc.property(vins, (vin) => {
					expect(isValidVin(` ${vin.toLowerCase()} `)).toBe(isValidVin(vin));
					expect(isValidVin(` ${vin.toLowerCase()} `, { checkDigit: true })).toBe(
						isValidVin(vin, { checkDigit: true }),
					);
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
	test("should take a string and options and return a boolean", () => {
		expectTypeOf(isValidVin).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(isValidVin).parameter(1).toEqualTypeOf<IsValidVinOptions | undefined>();
		expectTypeOf<IsValidVinOptions["checkDigit"]>().toEqualTypeOf<boolean | undefined>();
		expectTypeOf(isValidVin).returns.toEqualTypeOf<boolean>();
	});
});
