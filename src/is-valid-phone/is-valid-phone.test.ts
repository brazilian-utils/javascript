import { describe, expect, test } from "../_internals/test/runtime";
import { isValidPhone } from "./is-valid-phone";

describe("isValidPhone", () => {
	describe("service numbers written with a country code", () => {
		test("should accept an explicit country code before a service number", () => {
			expect(isValidPhone("+55 0800 123 4567", { accept: ["service"] })).toBe(true);
			expect(isValidPhone("0055 4004-1234", { accept: ["service"] })).toBe(true);
			expect(isValidPhone("+55 0800 123 4567")).toBe(false);
		});
	});

	describe("should return false", () => {
		test("when it is an empty string", () => {
			expect(isValidPhone("")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPhone(null)).toBe(false);
		});

		test("when it is undefined or a number", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidPhone()).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidPhone(11_987_654_321)).toBe(false);
		});

		test("when length is invalid", () => {
			expect(isValidPhone("123")).toBe(false);
		});

		test("when DDD is invalid", () => {
			expect(isValidPhone("00999999999")).toBe(false);
		});

		test("when it is a service phone and accept is left to its default", () => {
			expect(isValidPhone("08001234567")).toBe(false);
			expect(isValidPhone("40041234")).toBe(false);
		});

		test("when accept is empty", () => {
			expect(isValidPhone("(11) 98765-4321", { accept: [] })).toBe(false);
			expect(isValidPhone("1130000000", { accept: [] })).toBe(false);
			expect(isValidPhone("08001234567", { accept: [] })).toBe(false);
		});

		test("when the kind is not accepted", () => {
			expect(isValidPhone("11987654321", { accept: ["landline"] })).toBe(false);
			expect(isValidPhone("1130000000", { accept: ["mobile"] })).toBe(false);
			expect(isValidPhone("11987654321", { accept: ["service"] })).toBe(false);
			expect(isValidPhone("08001234567", { accept: ["mobile", "landline"] })).toBe(false);
		});
	});

	describe("should return true", () => {
		test("when is a valid mobile phone version 2", () => {
			expect(isValidPhone("(11) 98765-4321")).toBe(true);
			expect(isValidPhone("11987654321", { version: 2 })).toBe(true);
		});

		test("when is a valid landline phone", () => {
			expect(isValidPhone("(11) 3000-0000")).toBe(true);
			expect(isValidPhone("1130000000")).toBe(true);
		});

		test("when is a valid mobile phone version 1", () => {
			expect(isValidPhone("11712345678", { version: 1 })).toBe(true);
		});

		test("when it carries the country code", () => {
			expect(isValidPhone("+5511987654321")).toBe(true);
			expect(isValidPhone("+55 11 98765-4321")).toBe(true);
			expect(isValidPhone("+55 (11) 98765-4321")).toBe(true);
			expect(isValidPhone("0055 11 98765-4321")).toBe(true);
			expect(isValidPhone("5511987654321")).toBe(true);
			expect(isValidPhone("+55 (11) 3000-0000")).toBe(true);
			expect(isValidPhone("+55 11 98765-4321", { version: 2 })).toBe(true);
		});

		test("when the kind is accepted", () => {
			expect(isValidPhone("11987654321", { accept: ["mobile"] })).toBe(true);
			expect(isValidPhone("1130000000", { accept: ["landline"] })).toBe(true);
			expect(isValidPhone("08001234567", { accept: ["service"] })).toBe(true);
			expect(isValidPhone("40041234", { accept: ["service"] })).toBe(true);
			expect(isValidPhone("190", { accept: ["service"] })).toBe(true);
			expect(isValidPhone("0800 123 4567", { accept: ["service"] })).toBe(true);
			expect(isValidPhone("11987654321", { accept: ["mobile", "landline", "service"] })).toBe(true);
			expect(isValidPhone("08001234567", { accept: ["mobile", "landline", "service"] })).toBe(true);
		});
	});
});
