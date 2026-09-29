import { describe, expect, test } from "../test/runtime";
import { hasOwnKey } from "./has-own-key";

describe("hasOwnKey", () => {
	test("should find an own key of the table", () => {
		expect(hasOwnKey({ SP: "8" }, "SP")).toBe(true);
	});

	test("should not find a key the table does not have, a prototype-chain key included", () => {
		for (const key of ["RJ", "constructor", "__proto__", "toString"]) {
			expect(hasOwnKey({ SP: "8" }, key)).toBe(false);
		}
	});
});
