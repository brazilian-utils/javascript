import { expectAlignedLookupTable } from "../test/lookup-table";
import { describe, test } from "../test/runtime";
import { CFOP_CODES } from "./cfop";
import { CFOP_DESCRIPTIONS } from "./cfop-descriptions";

describe("CFOP lookup table", () => {
	test("should hold one description per code, and 4 digit codes in ascending order", () => {
		expectAlignedLookupTable(CFOP_CODES, 4, CFOP_DESCRIPTIONS);
	});
});
