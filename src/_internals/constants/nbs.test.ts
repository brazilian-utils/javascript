import { expectAlignedLookupTable } from "../test/lookup-table";
import { describe, test } from "../test/runtime";
import { NBS_CODES } from "./nbs";
import { NBS_DESCRIPTIONS } from "./nbs-descriptions";

describe("NBS lookup table", () => {
	test("should hold one description per code, and 9 digit codes in ascending order", () => {
		expectAlignedLookupTable(NBS_CODES, 9, NBS_DESCRIPTIONS);
	});
});
