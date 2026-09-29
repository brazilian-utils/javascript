import * as fc from "fast-check";

import { describe, expect, test } from "../test/runtime";
import { findCodeIndex } from "./find-code-index";

/**
 * Packs ascending codes the way `packCodes` (`scripts/lookup-table.ts`) does, so the property
 * below can build tables of its own.
 *
 * @param {string[]} codes - Unique codes of one width, ascending.
 * @param {number} width - Their width.
 * @returns {string} The packed table.
 */
const pack = (codes: readonly string[], width: number): string => {
	let previous = 0;

	return `${width}:${codes
		.map((code) => {
			const difference = (Number(code) - previous).toString(36);
			previous = Number(code);

			return difference;
		})
		.join(",")}`;
};

describe("findCodeIndex", () => {
	test("should return the index of every code of the table", () => {
		expect(findCodeIndex("3:1,2,1", "001")).toBe(0);
		expect(findCodeIndex("3:1,2,1", "003")).toBe(1);
		expect(findCodeIndex("3:1,2,1", "004")).toBe(2);
	});

	test("should read differences written in base 36", () => {
		expect(findCodeIndex("4:ul,1", "1101")).toBe(0);
		expect(findCodeIndex("4:ul,1", "1102")).toBe(1);
	});

	test("should return -1 for a code the table does not list", () => {
		expect(findCodeIndex("3:1,2,1", "002")).toBe(-1);
		expect(findCodeIndex("3:1,2,1", "000")).toBe(-1);
		expect(findCodeIndex("3:1,2,1", "005")).toBe(-1);
	});

	test("should return -1 for a code that is not digits of the table width", () => {
		expect(findCodeIndex("3:1,2,1", "03")).toBe(-1);
		expect(findCodeIndex("3:1,2,1", "0003")).toBe(-1);
		expect(findCodeIndex("3:1,2,1", "00a")).toBe(-1);
		expect(findCodeIndex("3:1,2,1", " 03")).toBe(-1);
		expect(findCodeIndex("3:1,2,1", "01 ")).toBe(-1);
		expect(findCodeIndex("3:1,2,1", "1e0")).toBe(-1);
	});

	test("should find the same codes on every lookup of a table", () => {
		expect(findCodeIndex("2:5,5", "10")).toBe(1);
		expect(findCodeIndex("2:5,5", "10")).toBe(1);
		expect(findCodeIndex("2:5,5", "05")).toBe(0);
	});

	test("should agree with indexOf over the list of codes", () => {
		const tables = fc
			.integer({ min: 1, max: 6 })
			.chain((width) =>
				fc.tuple(
					fc.constant(width),
					fc.uniqueArray(fc.integer({ min: 0, max: 10 ** width - 1 }), { minLength: 1 }),
					fc.integer({ min: 0, max: 10 ** width - 1 }),
				),
			);

		fc.assert(
			fc.property(tables, ([width, values, value]) => {
				const codes = values
					.toSorted((a, b) => a - b)
					.map((item) => String(item).padStart(width, "0"));
				const code = String(value).padStart(width, "0");

				expect(findCodeIndex(pack(codes, width), code)).toBe(codes.indexOf(code));
			}),
		);
	});
});
