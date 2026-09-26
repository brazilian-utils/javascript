import { expectAlignedLookupTable } from "../test/lookup-table";
import { describe, test } from "../test/runtime";
import { CBO_CODES } from "./cbo";
import { CBO_DESCRIPTIONS } from "./cbo-descriptions";

describe("CBO lookup table", () => {
	test("should hold one description per code, and 6 digit codes in ascending order", () => {
		expectAlignedLookupTable(CBO_CODES, 6, CBO_DESCRIPTIONS);
	});
});
