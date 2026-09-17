import { describe, expect, expectTypeOf, test } from "../test/runtime";
import { pickRandom } from "./pick-random";

describe("pickRandom", () => {
	test("should always pick the only item of a one item list", () => {
		expect(pickRandom(["only"])).toBe("only");
	});

	test("should only ever pick an item of the list", () => {
		const items = [11, 21, 31, 41];

		for (let i = 0; i < 200; i++) {
			expect(items).toContain(pickRandom(items));
		}
	});

	test("should reach every item of the list", () => {
		const items = ["a", "b", "c"];
		const seen = new Set<string>();

		for (let i = 0; i < 500; i++) {
			seen.add(pickRandom(items));
		}

		expect([...seen].sort()).toEqual(items);
	});

	test("types", () => {
		expectTypeOf(pickRandom<number>).returns.toEqualTypeOf<number>();
	});
});
