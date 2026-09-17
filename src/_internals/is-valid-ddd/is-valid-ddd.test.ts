import { describe, expect, test } from "../test/runtime";
import { isValidDDD } from "./is-valid-ddd";

describe("isValidDDD", () => {
	test("should return true for a valid area code", () => {
		expect(isValidDDD("11987654321")).toBe(true);
	});

	test("should return false for an invalid area code", () => {
		expect(isValidDDD("00987654321")).toBe(false);
	});
});
