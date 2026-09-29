import { unpackCodes } from "../_internals/test/lookup-table";
import { describe, expect, test } from "../_internals/test/runtime";
import { NCM_CODES } from "./constants";

describe("NCM_CODES", () => {
	test("should hold 8 digit codes, unique and in ascending order", () => {
		const codes = unpackCodes(NCM_CODES);

		expect(codes.every((code) => /^\d{8}$/.test(code))).toBe(true);
		expect(codes.every((code, index) => index === 0 || codes[index - 1] < code)).toBe(true);
	});
});
