import { DATA } from "../constants/states";
import { describe, expect, test } from "../test/runtime";
import { completeState } from "./complete-state";

describe("completeState", () => {
	test("should keep every field of the state", () => {
		for (const state of DATA) {
			expect(completeState(state)).toMatchObject(state);
		}
	});

	test("should add the region IBGE code and the capital", () => {
		const saoPaulo = DATA.find((state) => state.code === "SP");

		expect(saoPaulo && completeState(saoPaulo)).toStrictEqual({
			code: "SP",
			name: "São Paulo",
			regionCode: "SE",
			regionName: "Sudeste",
			ibgeCode: 35,
			regionIbgeCode: 3,
			capital: { code: "3550308", name: "São Paulo" },
		});
	});

	test("should return a fresh state, leaving the entry of DATA as it is", () => {
		const [state] = DATA;
		const completed = completeState(state);

		expect(completed).not.toBe(state);
		expect(state).not.toHaveProperty("capital");
	});
});
