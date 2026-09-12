import * as fc from "fast-check";

import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatIban } from "./format-iban";

describe("formatIban", () => {
	it("should group a full IBAN in blocks of 4", () => {
		expect(formatIban("BR1500000000000010932840814P2")).toBe(
			"BR15 0000 0000 0000 1093 2840 814P 2",
		);
	});

	it("should uppercase a lowercase value", () => {
		expect(formatIban("br1500000000000010932840814p2")).toBe(
			"BR15 0000 0000 0000 1093 2840 814P 2",
		);
	});

	it("should format a partial value as far as it goes", () => {
		expect(formatIban("")).toBe("");
		expect(formatIban("B")).toBe("B");
		expect(formatIban("BR")).toBe("BR");
		expect(formatIban("BR1")).toBe("BR1");
		expect(formatIban("BR15")).toBe("BR15");
		expect(formatIban("BR150")).toBe("BR15 0");
		expect(formatIban("BR1500000000000010932840814P")).toBe("BR15 0000 0000 0000 1093 2840 814P");
	});

	it("should remove non alphanumeric characters before grouping", () => {
		expect(formatIban("BR15 0000-0000.0000/1093 2840 814P 2")).toBe(
			"BR15 0000 0000 0000 1093 2840 814P 2",
		);
	});

	it("should cap the result to 29 characters", () => {
		expect(formatIban("BR1500000000000010932840814P2EXTRACHARS")).toBe(
			"BR15 0000 0000 0000 1093 2840 814P 2",
		);
	});

	it("should return an empty string when the value is not a string", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatIban(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatIban()).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatIban(1_500_000_000_000)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatIban(true)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatIban({})).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatIban([])).toBe("");
	});

	describe("properties", () => {
		const values = fc.stringMatching(/^[A-Za-z0-9]{0,40}$/);

		test("should uppercase and group in blocks of four, keeping every character", () => {
			fc.assert(
				fc.property(values, (value) => {
					const formatted = formatIban(value);

					expect(/^(?:[A-Z0-9]{4} )*[A-Z0-9]{0,4}$/.test(formatted)).toBe(true);
					expect(formatted.replaceAll(" ", "")).toBe(value.toUpperCase().slice(0, 29));
				}),
			);
		});

		test("should be stable under its own output", () => {
			fc.assert(
				fc.property(values, (value) => {
					const formatted = formatIban(value);

					expect(formatIban(formatted)).toBe(formatted);
				}),
			);
		});

		test("should never throw and always return the IBAN as a string", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					expect(typeof formatIban(value as string)).toBe("string");
				}),
			);
		});
	});
});

describe("formatIban types", () => {
	test("should take a string and return a string", () => {
		expectTypeOf(formatIban).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(formatIban).returns.toEqualTypeOf<string>();
	});
});
