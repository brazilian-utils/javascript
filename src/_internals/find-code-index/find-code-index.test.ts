import * as fc from "fast-check";

import { describe, expect, test } from "../test/runtime";
import { findCodeIndex } from "./find-code-index";

const binaryCodes = (width: number): fc.Arbitrary<string> =>
	fc.string({ unit: fc.constantFrom("0", "1"), minLength: width, maxLength: width });

describe("findCodeIndex", () => {
	test("should return the index of every code of the table", () => {
		expect(findCodeIndex("001003004", "001")).toBe(0);
		expect(findCodeIndex("001003004", "003")).toBe(1);
		expect(findCodeIndex("001003004", "004")).toBe(2);
	});

	test("should return -1 for a code the table does not list", () => {
		expect(findCodeIndex("001003004", "002")).toBe(-1);
		expect(findCodeIndex("", "001")).toBe(-1);
	});

	test("should not match a code across two neighbours", () => {
		expect(findCodeIndex("001003004", "010")).toBe(-1);
		expect(findCodeIndex("001003004", "030")).toBe(-1);
		expect(findCodeIndex("10510599", "0510")).toBe(-1);
	});

	test("should find the first listing of a code only on a code boundary", () => {
		expect(findCodeIndex("100010", "010")).toBe(1);
	});

	test("should agree with indexOf over the list of codes", () => {
		const tables = fc
			.integer({ min: 1, max: 4 })
			.chain((width) => fc.tuple(fc.array(binaryCodes(width)), binaryCodes(width)));

		fc.assert(
			fc.property(tables, ([codes, code]) => {
				expect(findCodeIndex(codes.join(""), code)).toBe(codes.indexOf(code));
			}),
		);
	});
});
