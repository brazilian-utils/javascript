import { describe, expect, test } from "../test/runtime";
import { isValidCeiCnoNumber } from "./is-valid-cei-cno-number";

describe("isValidCeiCnoNumber", () => {
	describe("should return false", () => {
		test("when it is null", () => {
			// @ts-expect-error
			expect(isValidCeiCnoNumber(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error
			expect(isValidCeiCnoNumber(undefined)).toBe(false);
		});

		test("when it is a boolean", () => {
			// @ts-expect-error
			expect(isValidCeiCnoNumber(true)).toBe(false);
		});

		test("when it is an empty string", () => {
			expect(isValidCeiCnoNumber("")).toBe(false);
		});

		test("when it does not have 12 digits", () => {
			expect(isValidCeiCnoNumber("1234567890")).toBe(false);
			expect(isValidCeiCnoNumber("1234567890123")).toBe(false);
		});

		test("when it has 12 digits but an unsupported separator", () => {
			expect(isValidCeiCnoNumber("11#583#00249#85")).toBe(false);
		});

		test("when it has 12 digits grouped outside the 2-3-5-2 mask", () => {
			expect(isValidCeiCnoNumber("115.830.02498/5")).toBe(false);
		});

		test("when it contains letters", () => {
			expect(isValidCeiCnoNumber("aa.583.00249/85")).toBe(false);
		});

		test("when every digit is the same", () => {
			expect(isValidCeiCnoNumber("000000000000")).toBe(false);
			expect(isValidCeiCnoNumber("111111111111")).toBe(false);
		});

		test("when the check digit does not match (24.985.96743/68, yiibr/yii2-br-validator and marcos-cruz/Documento invalid case)", () => {
			expect(isValidCeiCnoNumber("24.985.96743/68")).toBe(false);
			expect(isValidCeiCnoNumber("249859674368")).toBe(false);
		});

		test("when a check digit of 0 is replaced by another digit (401800097960 of the Receita Federal CNO dataset)", () => {
			expect(isValidCeiCnoNumber("401800097961")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("for 11.583.00249/85 (yiibr/yii2-br-validator CeiValidatorTest)", () => {
			expect(isValidCeiCnoNumber("11.583.00249/85")).toBe(true);
			expect(isValidCeiCnoNumber("115830024985")).toBe(true);
		});

		test("for 27.729.71181/87 (yiibr/yii2-br-validator CeiValidatorTest)", () => {
			expect(isValidCeiCnoNumber("27.729.71181/87")).toBe(true);
			expect(isValidCeiCnoNumber("277297118187")).toBe(true);
		});

		test("for 24.985.96743/86 (marcos-cruz/Documento CeiTest)", () => {
			expect(isValidCeiCnoNumber("24.985.96743/86")).toBe(true);
		});

		test("for 110840168062, an obra in Botelhos/MG of the Receita Federal CNO open dataset", () => {
			expect(isValidCeiCnoNumber("110840168062")).toBe(true);
			expect(isValidCeiCnoNumber("11.084.01680/62")).toBe(true);
		});

		test("for 401800097960, whose check digit is 0 (Receita Federal CNO open dataset, Frutal/MG)", () => {
			expect(isValidCeiCnoNumber("401800097960")).toBe(true);
			expect(isValidCeiCnoNumber(401800097960)).toBe(true);
		});

		test("for a number input", () => {
			expect(isValidCeiCnoNumber(249859674386)).toBe(true);
		});

		test("for a whitespace mask and surrounding whitespace", () => {
			expect(isValidCeiCnoNumber(" 11 583 00249 85 ")).toBe(true);
		});
	});
});
