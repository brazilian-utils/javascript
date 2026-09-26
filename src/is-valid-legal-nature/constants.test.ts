import { describe, expect, test } from "../_internals/test/runtime";
import { LEGAL_NATURE, LEGAL_NATURE_CODES } from "./constants";

describe("LEGAL_NATURE_CODES", () => {
	test("should hold exactly the codes of LEGAL_NATURE, four digits each, in ascending order", () => {
		expect(LEGAL_NATURE_CODES.match(/.{4}/g)).toStrictEqual(Object.keys(LEGAL_NATURE).toSorted());
		expect(LEGAL_NATURE_CODES).toMatch(/^\d+$/);
	});
});
