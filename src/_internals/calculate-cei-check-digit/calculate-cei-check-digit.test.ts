import { describe, expect, test } from "../test/runtime";
import { calculateCeiCheckDigit } from "./calculate-cei-check-digit";

describe("calculateCeiCheckDigit", () => {
	test("should return 5 for the base of 11.583.00249/85 (yiibr/yii2-br-validator CeiValidatorTest)", () => {
		expect(calculateCeiCheckDigit("11583002498")).toBe(5);
	});

	test("should return 7 for the base of 27.729.71181/87 (yiibr/yii2-br-validator CeiValidatorTest)", () => {
		expect(calculateCeiCheckDigit("27729711818")).toBe(7);
	});

	test("should return 6 for the base of 24.985.96743/86 (marcos-cruz/Documento CeiTest)", () => {
		expect(calculateCeiCheckDigit("24985967438")).toBe(6);
	});

	test("should return 0 when the folded sum ends in 0 (CNO 401800097960 of the Receita Federal CNO dataset)", () => {
		expect(calculateCeiCheckDigit("40180009796")).toBe(0);
	});

	test("should return 0 for a base of only zeros", () => {
		expect(calculateCeiCheckDigit("00000000000")).toBe(0);
	});
});
