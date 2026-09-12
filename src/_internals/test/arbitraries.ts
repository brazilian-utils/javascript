import * as fc from "fast-check";

import { HOLIDAYS_MAX_YEAR, HOLIDAYS_MIN_YEAR } from "../constants/holidays";
import { DATA as STATES, type StateCode } from "../constants/states";

/**
 * Spreads `separators` around every character of `value`: one before the first character, one
 * between each pair and one after the last, so `separators` must hold `value.length + 1` entries.
 * @param {string} value The characters to spread the separators around.
 * @param {string[]} separators The separators to place around each character.
 * @returns {string} The interleaved value.
 */
const interleave = (value: string, separators: string[]): string => {
	let result = separators[0];

	for (let index = 0; index < value.length; index++) {
		result += `${value[index]}${separators[index + 1]}`;
	}

	return result;
};

const anyPrimitive: fc.Arbitrary<unknown> = fc.oneof(fc.string(), fc.integer(), fc.boolean());

/** Any grapheme string: the widest text a util is expected to survive. */
export const anyText: fc.Arbitrary<string> = fc.string({ unit: "grapheme" });

/** Text, numbers, booleans, `undefined`, `null` and arrays: what a caller may pass by mistake. */
export const anyValue: fc.Arbitrary<unknown> = fc.oneof(
	anyText,
	fc.double(),
	fc.boolean(),
	fc.constantFrom(undefined, null),
	fc.array(fc.string()),
);

/** ASCII alphanumeric text, at most twelve characters long. */
export const asciiAlphanumericText: fc.Arbitrary<string> = fc.stringMatching(/^[0-9A-Za-z]{0,12}$/);

/** Booleans, `null`, numbers, strings, arrays and plain objects, including nested primitives. */
export const anyGarbage: fc.Arbitrary<unknown> = fc.oneof(
	fc.boolean(),
	fc.constant(null),
	fc.double(),
	fc.string(),
	fc.array(anyPrimitive),
	fc.object({ key: fc.constantFrom("a", "b", "c") }),
);

/**
 * @param {number} length How many digits the generated value holds.
 * @returns {fc.Arbitrary<string>} Strings of exactly `length` digits.
 */
export const digits = (length: number): fc.Arbitrary<string> =>
	fc.stringMatching(new RegExp(`^[0-9]{${length}}$`));

/**
 * @param {number} maxLength The largest number of digits the generated value holds.
 * @returns {fc.Arbitrary<string>} Strings of zero up to `maxLength` digits.
 */
export const digitsUpTo = (maxLength: number): fc.Arbitrary<string> =>
	fc.stringMatching(new RegExp(`^[0-9]{0,${maxLength}}$`));

/**
 * @param {number} maxLength The largest number of digits the generated value holds.
 * @param {number[]} lengths The lengths to leave out.
 * @returns {fc.Arbitrary<string>} Digit strings whose length is none of `lengths`.
 */
export const digitsOfOtherLength = (maxLength: number, lengths: number[]): fc.Arbitrary<string> =>
	digitsUpTo(maxLength).filter((value) => !lengths.includes(value.length));

/**
 * @param {string[]} maskChars The characters a separator is built from.
 * @param {number} count How many separators the generated array holds.
 * @param {number} maxLength The largest length of a single separator.
 * @returns {fc.Arbitrary<string[]>} Arrays of exactly `count` separators.
 */
export const maskSeparators = (
	maskChars: string[],
	count: number,
	maxLength: number,
): fc.Arbitrary<string[]> =>
	fc.array(fc.string({ unit: fc.constantFrom(...maskChars), maxLength }), {
		minLength: count,
		maxLength: count,
	});

/**
 * @param {fc.Arbitrary<string>} source The values to spread the mask over.
 * @param {string[]} maskChars The characters a separator is built from.
 * @param {number} maxLength The largest length of a single separator.
 * @returns {fc.Arbitrary<string>} Values of `source` with a separator around every character.
 */
export const maskedValues = (
	source: fc.Arbitrary<string>,
	maskChars: string[],
	maxLength: number,
): fc.Arbitrary<string> =>
	source.chain((value) =>
		maskSeparators(maskChars, value.length + 1, maxLength).map((separators) =>
			interleave(value, separators),
		),
	);

/** The two letter code of every Brazilian state. */
export const stateCodes: fc.Arbitrary<StateCode> = fc.constantFrom(
	...STATES.map((state) => state.code),
);

/** A year covered by the bundled holiday tables. */
export const holidayYears: fc.Arbitrary<number> = fc.integer({
	min: HOLIDAYS_MIN_YEAR,
	max: HOLIDAYS_MAX_YEAR,
});

/** A zero based month index, as `Date` numbers them. */
export const monthIndexes: fc.Arbitrary<number> = fc.integer({ min: 0, max: 11 });

/** A day of the month that exists in every month, February included. */
export const monthDays: fc.Arbitrary<number> = fc.integer({ min: 1, max: 28 });

/** A valid date inside the range the business day utils are exercised over. */
export const businessDayDates: fc.Arbitrary<Date> = fc.date({
	min: new Date(1950, 0, 1),
	max: new Date(2050, 11, 31),
	noInvalidDate: true,
});

/** An amount with at most two decimals, the precision currency formatting round-trips. */
export const twoDecimalAmounts: fc.Arbitrary<number> = fc
	.integer({ min: -1_000_000_000, max: 1_000_000_000 })
	.map((cents) => cents / 100);
