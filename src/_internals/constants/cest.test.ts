import { expectAlignedLookupTable } from "../test/lookup-table";
import { describe, test } from "../test/runtime";
import { CEST_CODES } from "./cest";
import { CEST_DESCRIPTIONS } from "./cest-descriptions";

describe("CEST lookup table", () => {
	test("should hold one description per code, and 7 digit codes in ascending order", () => {
		expectAlignedLookupTable(CEST_CODES, 7, CEST_DESCRIPTIONS);
	});
});
