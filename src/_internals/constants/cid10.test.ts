import { cid10Codes } from "../test/lookup-table";
import { describe, expect, test } from "../test/runtime";
import { unpackTexts } from "../unpack-texts/unpack-texts";
import { CID10_DESCRIPTIONS } from "./cid10-descriptions";

describe("CID-10 lookup table", () => {
	test("should hold one description per code, codes listed in ascending order", () => {
		const codes = cid10Codes();

		expect(codes).toHaveLength(unpackTexts(CID10_DESCRIPTIONS).length);
		expect(codes.every((code, index) => index === 0 || codes[index - 1] < code)).toBe(true);

		for (const description of unpackTexts(CID10_DESCRIPTIONS))
			expect(description.trim()).not.toBe("");
	});
});
