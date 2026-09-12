import * as fc from "fast-check";

import { twoDecimalAmounts } from "../_internals/test/arbitraries";
import { expectRoundTrip } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { formatCurrency } from "../format-currency/format-currency";
import { parseCurrency, type ParseCurrencyOptions } from "./parse-currency";

describe("parseCurrency", () => {
	describe("should return correct values", () => {
		test("when parsing currency with symbol", () => {
			expect(parseCurrency("R$ 1.234,56")).toBe(1234.56);
		});

		test("when parsing currency without symbol", () => {
			expect(parseCurrency("1234,56")).toBe(1234.56);
		});

		test("when parsing small values", () => {
			expect(parseCurrency("R$ 0,50")).toBe(0.5);
		});

		test("when parsing zero", () => {
			expect(parseCurrency("0")).toBe(0);
			expect(parseCurrency("0,00")).toBe(0);
		});

		test("when parsing large values", () => {
			expect(parseCurrency("R$ 10.000,00")).toBe(10_000);
			expect(parseCurrency("1.000.000,50")).toBe(1_000_000.5);
		});
	});

	describe("should return 0", () => {
		test("when it is an empty string", () => {
			expect(parseCurrency("")).toBe(0);
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(parseCurrency(null)).toBe(0);
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(parseCurrency()).toBe(0);
		});

		test("should transform a formatted value into a float", () => {
			expect(parseCurrency("")).toBe(0);
			expect(parseCurrency("R$ 1,00")).toBe(1);
			expect(parseCurrency("R$ 1,10")).toBe(1.1);
			expect(parseCurrency("R$ 1,01")).toBe(1.01);
			expect(parseCurrency("R$ 10,01")).toBe(10.01);
			expect(parseCurrency("R$ 100,01")).toBe(100.01);
			expect(parseCurrency("R$ 1.000,01")).toBe(1000.01);
			expect(parseCurrency("R$ 10.000,01")).toBe(10_000.01);
			expect(parseCurrency("R$ 100.000,01")).toBe(100_000.01);
			expect(parseCurrency("R$ 1.000.000,01")).toBe(1_000_000.01);
		});
	});

	describe("should preserve the sign", () => {
		test("when the value is negative", () => {
			expect(parseCurrency("-R$ 1,00")).toBe(-1);
			expect(parseCurrency("-1.234,56")).toBe(-1234.56);
			expect(parseCurrency("R$ -0,50")).toBe(-0.5);
		});

		test("when the value is negative zero", () => {
			expect(Object.is(parseCurrency("-0,00"), 0)).toBe(true);
		});
	});

	describe("should read the separators", () => {
		test("when the fraction is shorter than the precision", () => {
			expect(parseCurrency("R$ 1.234,5")).toBe(1234.5);
			expect(parseCurrency("R$ 1.234.5")).toBe(1234.5);
		});

		test("when the separator is a dot", () => {
			expect(parseCurrency("1234.56")).toBe(1234.56);
			expect(parseCurrency("12.34")).toBe(12.34);
		});

		test("when there is only a thousands separator", () => {
			expect(parseCurrency("R$ 1.234")).toBe(1234);
			expect(parseCurrency("R$ 1.000.000")).toBe(1_000_000);
			expect(parseCurrency("1,5")).toBe(1.5);
			expect(parseCurrency("1.059")).toBe(1059);
		});
	});

	describe("should keep the cents convention for plain digit strings", () => {
		test("when there is no separator at all", () => {
			expect(parseCurrency("1234")).toBe(12.34);
			expect(parseCurrency("R$ 50")).toBe(0.5);
			expect(parseCurrency("1234", { precision: 0 })).toBe(1234);
		});
	});

	describe("should honor the precision option", () => {
		test("when precision is 3", () => {
			expect(parseCurrency("1,001", { precision: 3 })).toBe(1.001);
			expect(parseCurrency("R$ 1.000,001", { precision: 3 })).toBe(1000.001);
		});

		test("when the precision is out of range", () => {
			expect(parseCurrency("R$ 1,50", { precision: -1 })).toBe(1.5);
			expect(parseCurrency("R$ 150", { precision: -1 })).toBe(150);
			expect(parseCurrency("R$ 150", { precision: 21 })).toBe(150 / 10 ** 20);
		});
	});

	describe("should round-trip with formatCurrency", () => {
		test("when using the default precision", () => {
			expect(parseCurrency(formatCurrency(1234.56))).toBe(1234.56);
			expect(parseCurrency(formatCurrency(-1234.56, { symbol: true }))).toBe(-1234.56);
		});

		test("when using a custom precision", () => {
			expect(parseCurrency(formatCurrency(1.001, { precision: 3 }), { precision: 3 })).toBe(1.001);
			expect(parseCurrency(formatCurrency(1_000_000.001, { precision: 3 }), { precision: 3 })).toBe(
				1_000_000.001,
			);
		});
	});

	describe("properties", () => {
		test("should never throw and always return a finite number, regardless of the input", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					const result = parseCurrency(value as never);

					expect(Number.isFinite(result)).toBe(true);
				}),
			);
		});

		test("should round-trip with formatCurrency for any value with 2 decimals", () => {
			expectRoundTrip(formatCurrency, parseCurrency, twoDecimalAmounts);
		});
	});
});

describe("parseCurrency types", () => {
	test("should take a string, options, and return a number", () => {
		expectTypeOf(parseCurrency).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(parseCurrency).parameter(1).toEqualTypeOf<ParseCurrencyOptions | undefined>();
		expectTypeOf<ParseCurrencyOptions["precision"]>().toEqualTypeOf<number | undefined>();
		expectTypeOf(parseCurrency).returns.toEqualTypeOf<number>();
	});
});
