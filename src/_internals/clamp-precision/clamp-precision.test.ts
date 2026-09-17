import { describe, expect, test } from "../test/runtime";
import { clampPrecision } from "./clamp-precision";

describe("clampPrecision", () => {
	test("should default to 2", () => {
		expect(clampPrecision()).toBe(2);
		expect(clampPrecision()).toBe(2);
	});

	test("should default to 2 when it is not a finite number", () => {
		expect(clampPrecision(Number.NaN)).toBe(2);
		expect(clampPrecision(Number.POSITIVE_INFINITY)).toBe(2);
		// @ts-expect-error: intentionally invalid input
		expect(clampPrecision("3")).toBe(2);
	});

	test("should keep valid precisions", () => {
		expect(clampPrecision(0)).toBe(0);
		expect(clampPrecision(3)).toBe(3);
		expect(clampPrecision(20)).toBe(20);
		expect(clampPrecision(20)).toBe(20);
	});

	test("should clamp out of range precisions", () => {
		expect(clampPrecision(-1)).toBe(0);
		expect(clampPrecision(-100)).toBe(0);
		expect(clampPrecision(21)).toBe(20);
		expect(clampPrecision(1000)).toBe(20);
	});

	test("should truncate fractional precisions", () => {
		expect(clampPrecision(2.9)).toBe(2);
	});
});
