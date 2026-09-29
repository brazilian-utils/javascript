import { readCid10Subcategories } from "../read-cid10-subcategories/read-cid10-subcategories";
import { describe, expect, test } from "../test/runtime";
import { readCid10CategoryOffsets } from "./read-cid10-category-offsets";

describe("readCid10CategoryOffsets", () => {
	test("should start the first category at 0 and skip one description per subcategory", () => {
		const offsets = readCid10CategoryOffsets();

		expect(offsets["A00"]).toBe(0);
		expect(offsets["A01"]).toBe(4);
		expect(offsets["A02"]).toBe(10);
	});

	test("should list every category the subcategories table lists, in the same order", () => {
		const subcategories = readCid10Subcategories();
		const offsets = readCid10CategoryOffsets();
		let expected = 0;

		for (const category of Object.keys(subcategories)) {
			expect(offsets[category]).toBe(expected);
			expected += 1 + subcategories[category].length;
		}

		expect(Object.keys(offsets)).toHaveLength(2046);
	});

	test("should hand back the same object on every read", () => {
		expect(readCid10CategoryOffsets()).toBe(readCid10CategoryOffsets());
	});
});
