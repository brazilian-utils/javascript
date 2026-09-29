import { describe, expect, test } from "../test/runtime";
import { readCid10Subcategories } from "./read-cid10-subcategories";

describe("readCid10Subcategories", () => {
	test("should read the fourth characters of the subcategories of a category", () => {
		const categories = readCid10Subcategories();

		expect(categories["A00"]).toBe("019");
		expect(categories["A01"]).toBe("01234");
		expect(categories["A04"]).toBe("0123456789");
		expect(categories["U07"]).toBe("012");
	});

	test("should read an empty string for a category that is not subdivided", () => {
		expect(readCid10Subcategories()["A09"]).toBe("");
	});

	test("should read the categories in ascending order, each a letter and two digits", () => {
		const categories = Object.keys(readCid10Subcategories());

		expect(categories).toHaveLength(2046);
		expect(categories[0]).toBe("A00");
		expect(categories.at(-1)).toBe("Z99");
		expect(categories.every((category) => /^[A-Z]\d{2}$/.test(category))).toBe(true);
		expect(
			categories.every((category, index) => index === 0 || categories[index - 1] < category),
		).toBe(true);
	});

	test("should read only ascending digits as subcategories", () => {
		for (const digits of Object.values(readCid10Subcategories())) {
			expect(digits).toMatch(/^\d*$/);
			expect([...new Set(digits)].sort().join("")).toBe(digits);
		}
	});

	test("should hand back the same object on a second read", () => {
		expect(readCid10Subcategories()).toBe(readCid10Subcategories());
	});
});
