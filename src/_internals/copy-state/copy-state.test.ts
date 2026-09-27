import { DATA } from "../constants/states";
import { describe, expect, test } from "../test/runtime";
import { copyState } from "./copy-state";

describe("copyState", () => {
	test("should copy every field of the state", () => {
		for (const state of DATA) {
			expect(copyState(state)).toStrictEqual(state);
		}
	});

	test("should return a fresh state and a fresh capital", () => {
		const [state] = DATA;
		const copy = copyState(state);

		expect(copy).not.toBe(state);
		expect(copy.capital).not.toBe(state.capital);
	});
});
