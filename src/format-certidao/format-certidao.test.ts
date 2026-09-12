import { describe, expect, test } from "../_internals/test/runtime";
import { formatCertidao } from "./format-certidao";

describe("formatCertidao", () => {
	describe("should return an empty string", () => {
		test("when it is null", () => {
			// @ts-expect-error
			expect(formatCertidao(null)).toBe("");
		});

		test("when it is undefined", () => {
			// @ts-expect-error
			expect(formatCertidao(undefined)).toBe("");
		});

		test("when it is an empty string", () => {
			expect(formatCertidao("")).toBe("");
		});
	});

	describe("should return the matrícula in the printed mask", () => {
		test("for the 32 digits of the ghiorzi.org/DVnew.htm worked example", () => {
			expect(formatCertidao("10453901552013100012021000012321")).toBe(
				"104539 01 55 2013 1 00012 021 0000123 21",
			);
		});

		test("for a value already carrying the dotted mask of the Provimento", () => {
			expect(formatCertidao("104539.01.55.2013.1.00012.021.0000123-21")).toBe(
				"104539 01 55 2013 1 00012 021 0000123 21",
			);
		});

		test("for 094300 01 55 2010 1 00020 112 0000120-87 (klawdyo/validation-br certidao.spec.ts)", () => {
			expect(formatCertidao("09430001552010100020112000012087")).toBe(
				"094300 01 55 2010 1 00020 112 0000120 87",
			);
		});
	});

	describe("should return a partial mask", () => {
		test("when the value has fewer than 32 digits", () => {
			expect(formatCertidao("10453901")).toBe("104539 01");
		});

		test("when the value has more than 32 digits, dropping the excess", () => {
			expect(formatCertidao("1045390155201310001202100001232199")).toBe(
				"104539 01 55 2013 1 00012 021 0000123 21",
			);
		});
	});

	describe("should left pad the value", () => {
		test("when options.pad is true", () => {
			expect(formatCertidao("1552010100020112000012087", { pad: true })).toBe(
				"000000 01 55 2010 1 00020 112 0000120 87",
			);
		});
	});

	describe("should accept a number", () => {
		test("for a value short enough to be an exact integer", () => {
			expect(formatCertidao(104539015520)).toBe("104539 01 55 20");
		});
	});
});
