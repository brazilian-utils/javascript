import * as fc from "fast-check";

import { anyValue, maskedValues } from "../_internals/test/arbitraries";
import {
	expectAccepted,
	expectAlwaysReturnsType,
	expectRejected,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isValidPassport } from "./is-valid-passport";

describe("isValidPassport", () => {
	describe("should return false", () => {
		test("when passport is not a string", () => {
			expect(isValidPassport(1)).toBe(false);
		});

		test("when passport is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPassport(null)).toBe(false);
		});

		test("when passport is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPassport()).toBe(false);
		});

		test("when passport is an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPassport({})).toBe(false);
		});

		test("when passport length is different from 8", () => {
			expect(isValidPassport("1")).toBe(false);
		});

		test("when passport does not match the expected format", () => {
			expect(isValidPassport("1112223334-")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("when passport is valid", () => {
			expect(isValidPassport("AA111111")).toBe(true);
			expect(isValidPassport("CL125167")).toBe(true);
		});

		test("when passport is lowercase", () => {
			expect(isValidPassport("ab123456")).toBe(true);
		});

		test("when passport contains mask symbols", () => {
			expect(isValidPassport("AB-123456")).toBe(true);
			expect(isValidPassport("AB.123.456")).toBe(true);
		});
	});

	describe("properties", () => {
		test("should ignore case and every non alphanumeric character", () => {
			const passport = fc.stringMatching(/^[A-Za-z]{2}[0-9]{6}$/);

			expectAccepted(isValidPassport, maskedValues(passport, [".", "-", "/", " ", "_"], 2));
		});

		test("should reject any alphanumeric value that is not 2 letters and 6 digits", () => {
			const notAPassport = fc
				.stringMatching(/^[0-9A-Z]{0,12}$/)
				.filter((value) => !/^[A-Z]{2}[0-9]{6}$/.test(value));

			expectRejected(isValidPassport, notAPassport);
		});

		test("should never throw and always return a boolean", () => {
			expectAlwaysReturnsType(isValidPassport, "boolean", anyValue);
		});
	});
});

describe("isValidPassport types", () => {
	test("should take a string or number and return a boolean", () => {
		expectTypeOf(isValidPassport).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(isValidPassport).returns.toEqualTypeOf<boolean>();
	});
});
