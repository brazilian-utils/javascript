import * as fc from "fast-check";

import { anyGarbage, twoDecimalAmounts } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectNeverThrowsWithOptions,
	expectRoundTrip,
} from "../_internals/test/properties";
import { bench, describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseCurrency } from "../parse-currency/parse-currency";
import { formatCurrency, type FormatCurrencyOptions } from "./format-currency";

describe("formatCurrency", () => {
	it("should formatCurrency positive currency into BRL", () => {
		expect(formatCurrency(0.01)).toBe("0,01");
		expect(formatCurrency(0.1)).toBe("0,10");
		expect(formatCurrency(1)).toBe("1,00");
		expect(formatCurrency(10)).toBe("10,00");
		expect(formatCurrency(10.1)).toBe("10,10");
		expect(formatCurrency(10.01)).toBe("10,01");
		expect(formatCurrency(100.01)).toBe("100,01");
		expect(formatCurrency(1000.01)).toBe("1.000,01");
		expect(formatCurrency(10_000.01)).toBe("10.000,01");
		expect(formatCurrency(100_000.01)).toBe("100.000,01");
		expect(formatCurrency(1_000_000.01)).toBe("1.000.000,01");
	});

	it("should formatCurrency negative currency into BRL", () => {
		expect(formatCurrency(-0.01)).toBe("-0,01");
		expect(formatCurrency(-0.1)).toBe("-0,10");
		expect(formatCurrency(-1)).toBe("-1,00");
		expect(formatCurrency(-10)).toBe("-10,00");
		expect(formatCurrency(-10.1)).toBe("-10,10");
		expect(formatCurrency(-10.01)).toBe("-10,01");
		expect(formatCurrency(-100.01)).toBe("-100,01");
		expect(formatCurrency(-1000.01)).toBe("-1.000,01");
		expect(formatCurrency(-10_000.01)).toBe("-10.000,01");
		expect(formatCurrency(-100_000.01)).toBe("-100.000,01");
		expect(formatCurrency(-1_000_000.01)).toBe("-1.000.000,01");
	});

	it("should formatCurrency positive currency into BRL with currency sign", () => {
		expect(formatCurrency(0.01, { symbol: true })).toBe("R$ 0,01");
		expect(formatCurrency(0.1, { symbol: true })).toBe("R$ 0,10");
		expect(formatCurrency(1, { symbol: true })).toBe("R$ 1,00");
		expect(formatCurrency(10, { symbol: true })).toBe("R$ 10,00");
		expect(formatCurrency(10.1, { symbol: true })).toBe("R$ 10,10");
		expect(formatCurrency(10.01, { symbol: true })).toBe("R$ 10,01");
		expect(formatCurrency(100.01, { symbol: true })).toBe("R$ 100,01");
		expect(formatCurrency(1000.01, { symbol: true })).toBe("R$ 1.000,01");
		expect(formatCurrency(10_000.01, { symbol: true })).toBe("R$ 10.000,01");
		expect(formatCurrency(100_000.01, { symbol: true })).toBe("R$ 100.000,01");
		expect(formatCurrency(1_000_000.01, { symbol: true })).toBe("R$ 1.000.000,01");
	});

	it("should formatCurrency negative currency into BRL with currency sign", () => {
		expect(formatCurrency(-0.01, { symbol: true })).toBe("-R$ 0,01");
		expect(formatCurrency(-0.1, { symbol: true })).toBe("-R$ 0,10");
		expect(formatCurrency(-1, { symbol: true })).toBe("-R$ 1,00");
		expect(formatCurrency(-10, { symbol: true })).toBe("-R$ 10,00");
		expect(formatCurrency(-10.1, { symbol: true })).toBe("-R$ 10,10");
		expect(formatCurrency(-10.01, { symbol: true })).toBe("-R$ 10,01");
		expect(formatCurrency(-100.01, { symbol: true })).toBe("-R$ 100,01");
		expect(formatCurrency(-1000.01, { symbol: true })).toBe("-R$ 1.000,01");
		expect(formatCurrency(-10_000.01, { symbol: true })).toBe("-R$ 10.000,01");
		expect(formatCurrency(-100_000.01, { symbol: true })).toBe("-R$ 100.000,01");
		expect(formatCurrency(-1_000_000.01, { symbol: true })).toBe("-R$ 1.000.000,01");
	});

	it("should formatCurrency with different precision", () => {
		expect(formatCurrency(0.01, { precision: 3 })).toBe("0,010");
		expect(formatCurrency(0.1, { precision: 3 })).toBe("0,100");
		expect(formatCurrency(1.1, { precision: 3 })).toBe("1,100");
		expect(formatCurrency(1.01, { precision: 3 })).toBe("1,010");
		expect(formatCurrency(1.001, { precision: 3 })).toBe("1,001");
		expect(formatCurrency(10.001, { precision: 3 })).toBe("10,001");
		expect(formatCurrency(100.001, { precision: 3 })).toBe("100,001");
		expect(formatCurrency(1000.001, { precision: 3 })).toBe("1.000,001");
		expect(formatCurrency(10_000.001, { precision: 3 })).toBe("10.000,001");
		expect(formatCurrency(100_000.001, { precision: 3 })).toBe("100.000,001");
		expect(formatCurrency(1_000_000.001, { precision: 3 })).toBe("1.000.000,001");
	});

	it("should read the separators of string inputs", () => {
		expect(formatCurrency("1234.56")).toBe("1.234,56");
		expect(formatCurrency("1234,56")).toBe("1.234,56");
		expect(formatCurrency("1.234,56")).toBe("1.234,56");
		expect(formatCurrency("R$ 1.234,56")).toBe("1.234,56");
		expect(formatCurrency("1234.56", { precision: 3 })).toBe("1.234,560");
		expect(formatCurrency("1.234,5")).toBe("1.234,50");
		expect(formatCurrency("R$ 1.234")).toBe("1.234,00");
	});

	it("should preserve the sign of string inputs", () => {
		expect(formatCurrency("-10.5")).toBe("-10,50");
		expect(formatCurrency("-1.234,56")).toBe("-1.234,56");
		expect(formatCurrency("-R$ 1,00", { symbol: true })).toBe("-R$ 1,00");
	});

	it("should read plain digit strings as whole units", () => {
		expect(formatCurrency("")).toBe("0,00");
		expect(formatCurrency("0")).toBe("0,00");
		expect(formatCurrency("123456")).toBe("123.456,00");
		expect(formatCurrency("-1234")).toBe("-1.234,00");
	});

	it("should clamp the precision to the range accepted by Intl", () => {
		expect(formatCurrency(1.5, { precision: -1 })).toBe("2");
		expect(formatCurrency(1.5, { precision: 21 })).toBe(`1,5${"0".repeat(19)}`);
		expect(formatCurrency(1.5, { precision: Number.NaN })).toBe("1,50");
	});

	it("should return an empty string for non finite numbers", () => {
		expect(formatCurrency(Number.NaN)).toBe("");
		expect(formatCurrency(Number.POSITIVE_INFINITY)).toBe("");
		expect(formatCurrency(Number.NEGATIVE_INFINITY)).toBe("");
		expect(formatCurrency(Number.NaN, { symbol: true })).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatCurrency()).toBe("");
	});

	it("should read as many fraction digits as the requested precision allows, not just the default 2, when reading a string", () => {
		expect(formatCurrency("1234,12345", { precision: 5 })).toBe("1.234,12345");
	});

	it("should replace the non-breaking space", () => {
		expect(formatCurrency(1234.56, { symbol: true })).toBe("R$ 1.234,56");
		expect(formatCurrency(1234.56, { symbol: true })).not.toContain("\u00A0");
	});

	describe("properties", () => {
		const optionsArbitrary = fc
			.option(fc.record({ symbol: fc.boolean(), precision: fc.double() }, { requiredKeys: [] }))
			.map((options) => options ?? undefined);

		test("should round-trip with parseCurrency for any value with 2 decimals", () => {
			expectRoundTrip(formatCurrency, parseCurrency, twoDecimalAmounts);
		});

		test("should never throw, regardless of the input", () => {
			expectNeverThrowsWithOptions(formatCurrency, anyGarbage, optionsArbitrary);
		});

		test("should always return a string", () => {
			expectAlwaysReturnsType(formatCurrency, "string", anyGarbage);
		});
	});
});

describe("formatCurrency types", () => {
	test("should take a string or number, options, and return a string", () => {
		expectTypeOf(formatCurrency).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatCurrency).parameter(1).toEqualTypeOf<FormatCurrencyOptions | undefined>();
		expectTypeOf<FormatCurrencyOptions["symbol"]>().toEqualTypeOf<boolean | undefined>();
		expectTypeOf<FormatCurrencyOptions["precision"]>().toEqualTypeOf<number | undefined>();
		expectTypeOf(formatCurrency).returns.toEqualTypeOf<string>();
	});
});

describe("formatCurrency benchmarks", () => {
	bench("formatCurrency(number)", () => {
		formatCurrency(1_234_567.89);
	});

	bench("formatCurrency(string with separators)", () => {
		formatCurrency("1.234.567,89");
	});

	bench("parseCurrency", () => {
		parseCurrency("R$ 1.234.567,89");
	});
});
