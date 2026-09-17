import * as fc from "fast-check";

import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseLicensePlate } from "./parse-license-plate";

describe("parseLicensePlate", () => {
	it("should remove formatting and normalize casing", () => {
		expect(parseLicensePlate("abc-1234")).toBe("ABC1234");
		expect(parseLicensePlate("abc1d23")).toBe("ABC1D23");
	});

	it("should ignore characters after the license plate length", () => {
		expect(parseLicensePlate("abc123456")).toBe("ABC1234");
		expect(parseLicensePlate("abc1d23xyz")).toBe("ABC1D23");
	});

	it("should return an empty string for a non-string value", () => {
		// @ts-expect-error not a string
		expect(parseLicensePlate(null)).toBe("");
	});

	describe("properties", () => {
		test("should only ever return up to seven uppercase alphanumerics", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), (value) => {
					expect(/^[A-Z0-9]{0,7}$/.test(parseLicensePlate(value))).toBe(true);
				}),
			);
		});

		test("should be idempotent over the plate characters", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), (value) => {
					const parsed = parseLicensePlate(value);

					expect(parseLicensePlate(parsed)).toBe(parsed);
				}),
			);
		});

		test("should never throw and always return the plate characters as a string", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					expect(typeof parseLicensePlate(value as string)).toBe("string");
				}),
			);
		});
	});
});

describe("parseLicensePlate types", () => {
	test("should take a string and return a string", () => {
		expectTypeOf(parseLicensePlate).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(parseLicensePlate).returns.toEqualTypeOf<string>();
	});
});
