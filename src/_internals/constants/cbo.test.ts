import { expectAlignedLookupTable } from "../test/lookup-table";
import { describe, expect, test } from "../test/runtime";
import { unpackTexts } from "../unpack-texts/unpack-texts";
import { CBO_CODES } from "./cbo";
import { CBO_DESCRIPTIONS } from "./cbo-descriptions";

describe("CBO lookup table", () => {
	test("should hold one description per code, and 6 digit codes in ascending order", () => {
		expectAlignedLookupTable(CBO_CODES, 6, CBO_DESCRIPTIONS);
	});

	test("should hold the 2,725 occupations of the Estrutura CBO release of 10/07/2026", () => {
		expect(unpackTexts(CBO_DESCRIPTIONS)).toHaveLength(2725);
	});
});
