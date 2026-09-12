import { describe, expect, test } from "../_internals/test/runtime";
import { isValidServicePhone } from "./is-valid-service-phone";

describe("isValidServicePhone", () => {
	describe("should return false", () => {
		test("when it is an empty string", () => {
			expect(isValidServicePhone("")).toBe(false);
		});

		test("when it is null, undefined or a number", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidServicePhone(null)).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidServicePhone()).toBe(false);
			// @ts-expect-error: intentionally invalid input
			expect(isValidServicePhone(8_001_234_567)).toBe(false);
		});

		test("when it is a geographic number", () => {
			expect(isValidServicePhone("11987654321")).toBe(false);
			expect(isValidServicePhone("1130000000")).toBe(false);
		});

		test("when the non-geographic prefix is unknown", () => {
			expect(isValidServicePhone("01001234567")).toBe(false);
			expect(isValidServicePhone("02001234567")).toBe(false);
			expect(isValidServicePhone("04001234567")).toBe(false);
			expect(isValidServicePhone("06001234567")).toBe(false);
			expect(isValidServicePhone("07001234567")).toBe(false);
			expect(isValidServicePhone("08101234567")).toBe(false);
			expect(isValidServicePhone("08011234567")).toBe(false);
		});

		test("when the non-geographic length is wrong", () => {
			expect(isValidServicePhone("0800123456")).toBe(false);
			expect(isValidServicePhone("080012345678")).toBe(false);
		});

		test("when the abbreviated root is unknown", () => {
			expect(isValidServicePhone("40201234")).toBe(false);
			expect(isValidServicePhone("31031234")).toBe(false);
			expect(isValidServicePhone("50041234")).toBe(false);
		});

		test("when the abbreviated length is wrong", () => {
			expect(isValidServicePhone("4004123")).toBe(false);
			expect(isValidServicePhone("400412345")).toBe(false);
		});

		test("when the utility code was never designated", () => {
			expect(isValidServicePhone("101")).toBe(false);
			expect(isValidServicePhone("110")).toBe(false);
			expect(isValidServicePhone("189")).toBe(false);
			expect(isValidServicePhone("200")).toBe(false);
			expect(isValidServicePhone("999")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("for every non-geographic prefix", () => {
			expect(isValidServicePhone("03001234567")).toBe(true);
			expect(isValidServicePhone("03031234567")).toBe(true);
			expect(isValidServicePhone("05001234567")).toBe(true);
			expect(isValidServicePhone("08001234567")).toBe(true);
			expect(isValidServicePhone("09001234567")).toBe(true);
		});

		test("for a formatted non-geographic number", () => {
			expect(isValidServicePhone("0800 123 4567")).toBe(true);
			expect(isValidServicePhone("0800-123-4567")).toBe(true);
			expect(isValidServicePhone("0300 123 4567")).toBe(true);
		});

		test("for every abbreviated root", () => {
			expect(isValidServicePhone("30001234")).toBe(true);
			expect(isValidServicePhone("30031234")).toBe(true);
			expect(isValidServicePhone("30091234")).toBe(true);
			expect(isValidServicePhone("40001234")).toBe(true);
			expect(isValidServicePhone("40021234")).toBe(true);
			expect(isValidServicePhone("40041234")).toBe(true);
			expect(isValidServicePhone("40091234")).toBe(true);
		});

		test("for a formatted abbreviated number", () => {
			expect(isValidServicePhone("4004-1234")).toBe(true);
			expect(isValidServicePhone("3003 1234")).toBe(true);
		});

		test("for the public utility codes", () => {
			expect(isValidServicePhone("100")).toBe(true);
			expect(isValidServicePhone("102")).toBe(true);
			expect(isValidServicePhone("112")).toBe(true);
			expect(isValidServicePhone("136")).toBe(true);
			expect(isValidServicePhone("156")).toBe(true);
			expect(isValidServicePhone("180")).toBe(true);
			expect(isValidServicePhone("181")).toBe(true);
			expect(isValidServicePhone("188")).toBe(true);
			expect(isValidServicePhone("190")).toBe(true);
			expect(isValidServicePhone("191")).toBe(true);
			expect(isValidServicePhone("192")).toBe(true);
			expect(isValidServicePhone("193")).toBe(true);
			expect(isValidServicePhone("199")).toBe(true);
		});
	});
});
