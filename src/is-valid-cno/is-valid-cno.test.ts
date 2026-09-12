import { describe, expect, test } from "../_internals/test/runtime";
import { isValidCno } from "./is-valid-cno";

describe("isValidCno", () => {
	describe("should return false", () => {
		test("when it is null", () => {
			// @ts-expect-error
			expect(isValidCno(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error
			expect(isValidCno(undefined)).toBe(false);
		});

		test("when it is an array", () => {
			// @ts-expect-error
			expect(isValidCno([])).toBe(false);
		});

		test("when it is an empty string", () => {
			expect(isValidCno("")).toBe(false);
		});

		test("when it does not have 12 digits", () => {
			expect(isValidCno("1234567890")).toBe(false);
			expect(isValidCno("1234567890123")).toBe(false);
		});

		test("when it has 12 digits but an unsupported separator", () => {
			expect(isValidCno("11#084#01680#62")).toBe(false);
		});

		test("when it has 12 digits grouped outside the 2-3-5-2 mask", () => {
			expect(isValidCno("110.840.16806/2")).toBe(false);
		});

		test("when every digit is the same", () => {
			expect(isValidCno("000000000000")).toBe(false);
		});

		test("when the check digit does not match (110840168062 with a 3)", () => {
			expect(isValidCno("110840168063")).toBe(false);
		});

		test("when a check digit of 0 is replaced by another digit (401800097960 of the Receita Federal CNO dataset)", () => {
			expect(isValidCno("401800097961")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("for 110840168062, an obra in Botelhos/MG of the Receita Federal CNO open dataset", () => {
			expect(isValidCno("110840168062")).toBe(true);
			expect(isValidCno("11.084.01680/62")).toBe(true);
		});

		test("for 111130137368, an obra in Campo do Meio/MG of the Receita Federal CNO open dataset", () => {
			expect(isValidCno("111130137368")).toBe(true);
		});

		test("for 112772388267 and 113381018769 of the Receita Federal CNO open dataset", () => {
			expect(isValidCno("112772388267")).toBe(true);
			expect(isValidCno("113381018769")).toBe(true);
		});

		test("for 401800097960, whose check digit is 0 (Receita Federal CNO open dataset, Frutal/MG)", () => {
			expect(isValidCno("401800097960")).toBe(true);
			expect(isValidCno(401800097960)).toBe(true);
		});

		test("for 512070915160, whose check digit is 0 (Receita Federal CNO open dataset, Capitólio/MG)", () => {
			expect(isValidCno("512070915160")).toBe(true);
		});

		test("for a legacy CEI number kept by the CNO (11.583.00249/85, yiibr/yii2-br-validator)", () => {
			expect(isValidCno("11.583.00249/85")).toBe(true);
		});

		test("for a whitespace mask and surrounding whitespace", () => {
			expect(isValidCno(" 11 084 01680 62 ")).toBe(true);
		});
	});
});
