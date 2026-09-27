import { describe, expect, test } from "../test/runtime";
import { findCepRange } from "./find-cep-range";

const RANGES = [
	{ start: 1_000_000, end: 19_999_999, label: "SP" },
	{ start: 20_000_000, end: 28_999_999, label: "RJ" },
];

describe("findCepRange", () => {
	test("should return the range that contains a formatted CEP", () => {
		expect(findCepRange("01310-100", RANGES)).toEqual(RANGES[0]);
	});

	test("should return the range that contains a CEP given as a number", () => {
		expect(findCepRange(20_040_020, RANGES)).toEqual(RANGES[1]);
	});

	test("should return the range that owns the first and the last CEP of a range", () => {
		expect(findCepRange("01000-000", RANGES)).toEqual(RANGES[0]);
		expect(findCepRange("19999-999", RANGES)).toEqual(RANGES[0]);
	});

	test("should return null for a CEP outside every range", () => {
		expect(findCepRange("29000-000", RANGES)).toBeNull();
	});

	test("should return null for an empty table", () => {
		expect(findCepRange("01310-100", [])).toBeNull();
	});

	test("should return null for an invalid CEP", () => {
		expect(findCepRange("12345", RANGES)).toBeNull();
		expect(findCepRange("abc01310100", RANGES)).toBeNull();
		expect(findCepRange(-20_040_020, RANGES)).toBeNull();
		expect(findCepRange(2_004_002.5, RANGES)).toBeNull();
	});

	test("should return null for a value that is not a string or a number", () => {
		// @ts-expect-error: intentionally invalid input
		expect(findCepRange(null, RANGES)).toBeNull();
		// @ts-expect-error: intentionally invalid input
		expect(findCepRange(undefined, RANGES)).toBeNull();
	});

	test("should return the first match when ranges overlap", () => {
		const overlapping = [
			{ start: 1_000_000, end: 2_000_000, label: "first" },
			{ start: 1_500_000, end: 2_500_000, label: "second" },
		];

		expect(findCepRange("01500-000", overlapping)).toEqual(overlapping[0]);
	});
});
