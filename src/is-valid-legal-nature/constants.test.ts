import { unpackCodes } from "../_internals/test/lookup-table";
import { describe, expect, test } from "../_internals/test/runtime";
import { LEGAL_NATURE, LEGAL_NATURE_CODES } from "./constants";

describe("LEGAL_NATURE_CODES", () => {
	test("should hold exactly the codes of LEGAL_NATURE, four digits each, in ascending order", () => {
		expect(unpackCodes(LEGAL_NATURE_CODES)).toStrictEqual(Object.keys(LEGAL_NATURE).toSorted());
		expect(LEGAL_NATURE_CODES.startsWith("4:")).toBe(true);
	});
});
