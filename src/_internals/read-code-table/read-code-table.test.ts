import { describe, expect, test } from "../test/runtime";
import { readCodeTable } from "./read-code-table";

describe("readCodeTable", () => {
	test("should read the code width and add the base 36 differences up", () => {
		expect(readCodeTable("3:a,5,z")).toEqual({ width: 3, values: [10, 15, 50] });
	});

	test("should read a table of one code", () => {
		expect(readCodeTable("7:1z")).toEqual({ width: 7, values: [71] });
	});

	test("should hand back the same table on a second read", () => {
		const first = readCodeTable("4:1,1,1");

		expect(first).toEqual({ width: 4, values: [1, 2, 3] });
		expect(readCodeTable("4:1,1,1")).toBe(first);
	});

	test("should keep two tables apart", () => {
		expect(readCodeTable("2:1,2")).toEqual({ width: 2, values: [1, 3] });
		expect(readCodeTable("5:2,2")).toEqual({ width: 5, values: [2, 4] });
	});
});
