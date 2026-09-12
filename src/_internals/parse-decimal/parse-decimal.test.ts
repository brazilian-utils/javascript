import { describe, expect, test } from "../test/runtime";
import { parseDecimal } from "./parse-decimal";

describe("parseDecimal", () => {
	test("should read the last short separator as the decimal separator", () => {
		expect(parseDecimal("R$ 1.234,56")).toBe(1234.56);
		expect(parseDecimal("1234,56")).toBe(1234.56);
		expect(parseDecimal("12.34")).toBe(12.34);
		expect(parseDecimal("1,5")).toBe(1.5);
	});

	test("should read a long run after the separator as thousands", () => {
		expect(parseDecimal("R$ 1.234")).toBe(1234);
		expect(parseDecimal("1.000.000")).toBe(1_000_000);
	});

	test("should read a value without separators as whole units by default", () => {
		expect(parseDecimal("1234")).toBe(1234);
	});

	test("should read a value without separators as minor units when asked", () => {
		expect(parseDecimal("1234", { minorUnits: 2 })).toBe(12.34);
		expect(parseDecimal("1234", { minorUnits: 3 })).toBe(1.234);
	});

	test("should honor maxFractionDigits", () => {
		expect(parseDecimal("1,001")).toBe(1001);
		expect(parseDecimal("1,001", { maxFractionDigits: 3 })).toBe(1.001);
	});

	test("should preserve a minus sign written before the first digit", () => {
		expect(parseDecimal("-R$ 1,00")).toBe(-1);
		expect(parseDecimal("R$ -0,50")).toBe(-0.5);
		expect(parseDecimal("-1234")).toBe(-1234);
	});

	test("should ignore a minus sign written after the first digit", () => {
		expect(parseDecimal("R1-")).toBe(1);
		expect(parseDecimal("100-")).toBe(100);
	});

	test("should normalize negative zero", () => {
		expect(Object.is(parseDecimal("-0,00"), 0)).toBe(true);
		expect(Object.is(parseDecimal("-0"), 0)).toBe(true);
	});

	test("should return 0 when there is nothing to read", () => {
		expect(parseDecimal("")).toBe(0);
		// @ts-expect-error: intentionally invalid input
		expect(parseDecimal(null)).toBe(0);
		expect(parseDecimal("R$")).toBe(0);
		expect(parseDecimal("-")).toBe(0);
	});

	test("should handle a trailing separator", () => {
		expect(parseDecimal("1.234,")).toBe(1234);
		expect(parseDecimal(",50")).toBe(0.5);
	});
});
