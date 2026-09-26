import { expectAlignedLookupTable } from "../test/lookup-table";
import { describe, test } from "../test/runtime";
import { SERVICE_ITEM_DESCRIPTIONS } from "./service-item-descriptions";
import { SERVICE_ITEM_CODES } from "./service-items";

describe("Service list lookup table", () => {
	test("should hold one description per code, and 4 digit codes in ascending order", () => {
		expectAlignedLookupTable(SERVICE_ITEM_CODES, 4, SERVICE_ITEM_DESCRIPTIONS);
	});
});
