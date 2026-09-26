import { expectAlignedLookupTable } from "../test/lookup-table";
import { describe, test } from "../test/runtime";
import { CNAE_CODES } from "./cnae";
import { CNAE_DESCRIPTIONS } from "./cnae-descriptions";

describe("CNAE lookup table", () => {
	test("should hold one description per code, and 7 digit codes in ascending order", () => {
		expectAlignedLookupTable(CNAE_CODES, 7, CNAE_DESCRIPTIONS);
	});
});
