import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isValidCns } from "./is-valid-cns";

const CARD_DIGITS = Array.from({ length: 10 }, (_, digit) => String(digit));

const findCns = (base: string): string => {
	for (const suffix of ["000", "001"]) {
		const card = CARD_DIGITS.map((digit) => `${base}${suffix}${digit}`).find((value) =>
			isValidCns(value),
		);

		if (card !== undefined) return card;
	}

	return "";
};

describe("isValidCns", () => {
	describe("should return false", () => {
		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCns(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCns()).toBe(false);
		});

		test("when it is a boolean", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCns(true)).toBe(false);
		});

		test("when it is an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCns({})).toBe(false);
		});

		test("when it is an array", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidCns([])).toBe(false);
		});

		test("when it is an empty string", () => {
			expect(isValidCns("")).toBe(false);
		});

		test("when it does not have 15 digits", () => {
			expect(isValidCns("12345678901")).toBe(false);
		});

		test("when the first digit is not 1, 2, 7, 8 or 9", () => {
			expect(isValidCns("312345678901234")).toBe(false);
			expect(isValidCns("012345678901234")).toBe(false);
			expect(isValidCns("612345678901234")).toBe(false);
		});

		test("when a definitive card has the wrong check digit", () => {
			expect(isValidCns("123456789010001")).toBe(false);
		});

		test("when a definitive card carries the 001 suffix without needing the +2 adjustment", () => {
			expect(isValidCns("123456789010010")).toBe(false);
		});

		test("when a definitive card whose raw check digit is 10 (base 10000000006) keeps the 000 suffix", () => {
			expect(isValidCns("100000000060000")).toBe(false);
			expect(isValidCns("100000000060008")).toBe(false);
		});

		test("when a provisional card's weighted sum is not a multiple of 11", () => {
			expect(isValidCns("700000000000001")).toBe(false);
		});

		test("when it does not have 15 digits, even though a provisional-style weighted sum over the given digits would be a multiple of 11", () => {
			expect(isValidCns("70000000000008")).toBe(false);
		});

		test("when the first digit is not 1 or 2, even though a 1 or 2 appears later and the rest forms a valid definitive checksum", () => {
			expect(isValidCns("012345678900006")).toBe(false);
		});

		test("when the first digit is not 7, 8 or 9, even though one of them appears later and the rest forms a valid provisional checksum", () => {
			expect(isValidCns("070000000000001")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("for a definitive CNS whose raw check digit does not need the +2 adjustment (base 12345678901, weighted sum 440, suffix 000, digit 0)", () => {
			expect(isValidCns("123456789010000")).toBe(true);
		});

		test("for a definitive CNS starting with 2 (base 20000000001, weighted sum 35, digit 9)", () => {
			expect(isValidCns("200000000010009")).toBe(true);
		});

		test("for a definitive CNS as a number", () => {
			expect(isValidCns(123_456_789_010_000)).toBe(true);
		});

		test("for a definitive CNS with a whitespace mask", () => {
			expect(isValidCns("123 4567 8901 0000")).toBe(true);
		});

		test("for a definitive CNS whose raw check digit is 10 (base 10000000006, weighted sum 45): sum raised to 47, digit 8, suffix 001", () => {
			expect(isValidCns("100000000060018")).toBe(true);
		});

		test("for a provisional CNS starting with 7", () => {
			expect(isValidCns("700000000000005")).toBe(true);
		});

		test("for a provisional CNS starting with 8", () => {
			expect(isValidCns("800000000000001")).toBe(true);
		});

		test("for a provisional CNS starting with 9", () => {
			expect(isValidCns("900000000000008")).toBe(true);
		});

		test("for a provisional CNS whose base 11 digits would NOT be a valid definitive checksum", () => {
			expect(isValidCns("712345678901236")).toBe(true);
		});
	});

	describe("properties", () => {
		const bases = fc.stringMatching(/^[12][0-9]{10}$/);

		test("should accept exactly one check digit for a definitive card", () => {
			fc.assert(
				fc.property(bases, (base) => {
					const card = findCns(base);
					const others = CARD_DIGITS.filter((digit) => digit !== card.slice(14));

					expect(card).not.toBe("");

					for (const digit of others) {
						expect(isValidCns(`${card.slice(0, 14)}${digit}`)).toBe(false);
					}
				}),
			);
		});

		test("should ignore the display groups of a card number", () => {
			fc.assert(
				fc.property(bases, (base) => {
					const card = findCns(base);
					const head = `${card.slice(0, 3)} ${card.slice(3, 7)}`;
					const tail = `${card.slice(7, 11)} ${card.slice(11)}`;

					expect(isValidCns(`${head} ${tail}`)).toBe(true);
				}),
			);
		});

		test("should reject any value that is not fifteen digits long", () => {
			fc.assert(
				fc.property(fc.stringMatching(/^[0-9]{0,20}$/), (value) => {
					fc.pre(value.length !== 15);

					expect(isValidCns(value)).toBe(false);
				}),
			);
		});

		test("should never throw and always judge a health card with a boolean", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					expect(typeof isValidCns(value as string)).toBe("boolean");
				}),
			);
		});
	});
});

describe("isValidCns types", () => {
	test("should take a string or number and return a boolean", () => {
		expectTypeOf(isValidCns).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(isValidCns).returns.toEqualTypeOf<boolean>();
	});
});
