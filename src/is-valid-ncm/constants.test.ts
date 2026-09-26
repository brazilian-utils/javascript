import { describe, expect, test } from "../_internals/test/runtime";
import { NCM_CODES } from "./constants";

describe("NCM_CODES", () => {
	test("should hold 8 digit codes back to back, unique and in ascending order", () => {
		const codes = NCM_CODES.match(/.{8}/g) ?? [];

		expect(NCM_CODES).toMatch(/^(?:\d{8})+$/);
		expect(codes.every((code, index) => index === 0 || codes[index - 1] < code)).toBe(true);
	});
});
