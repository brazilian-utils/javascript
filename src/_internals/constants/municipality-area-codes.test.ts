import { describe, expect, test } from "../test/runtime";
import { AREA_CODE_SECONDARY_STATES, AREA_CODE_STATES, VALID_AREA_CODES } from "./area-codes";
import { DATA as CITIES_DATA } from "./municipalities";
import { MUNICIPALITY_AREA_CODES } from "./municipality-area-codes";
import { type StateCode } from "./states";

const STATE_CODES = Object.keys(CITIES_DATA) as StateCode[];

const areaCodesOf = (stateCode: StateCode): number[] =>
	(MUNICIPALITY_AREA_CODES[stateCode].match(/\d{2}/g) ?? []).map(Number);

describe("MUNICIPALITY_AREA_CODES", () => {
	test("should cover the same states as the municipalities table", () => {
		expect(Object.keys(MUNICIPALITY_AREA_CODES).sort()).toEqual([...STATE_CODES].sort());
	});

	test("should hold two digits for every municipality of each state", () => {
		for (const stateCode of STATE_CODES) {
			expect(MUNICIPALITY_AREA_CODES[stateCode]).toMatch(/^(?:\d{2})+$/);
			expect(MUNICIPALITY_AREA_CODES[stateCode].length).toBe(CITIES_DATA[stateCode].length * 2);
		}
	});

	test("should only hold DDDs in use, each listing the state of the municipality", () => {
		for (const stateCode of STATE_CODES) {
			for (const areaCode of areaCodesOf(stateCode)) {
				expect(VALID_AREA_CODES).toContain(areaCode);
				expect([
					AREA_CODE_STATES[areaCode],
					...(AREA_CODE_SECONDARY_STATES[areaCode] ?? []),
				]).toContain(stateCode);
			}
		}
	});

	test("should give every one of the 67 DDDs, and every state a DDD lists, a municipality", () => {
		const statesByAreaCode = new Map<number, Set<StateCode>>();

		for (const stateCode of STATE_CODES) {
			for (const areaCode of areaCodesOf(stateCode)) {
				const states = statesByAreaCode.get(areaCode) ?? new Set<StateCode>();

				states.add(stateCode);
				statesByAreaCode.set(areaCode, states);
			}
		}

		expect([...statesByAreaCode.keys()].sort((a, b) => a - b)).toEqual(
			[...VALID_AREA_CODES].sort((a, b) => a - b),
		);

		for (const [areaCode, states] of statesByAreaCode) {
			expect([...states].sort()).toEqual(
				[AREA_CODE_STATES[areaCode], ...(AREA_CODE_SECONDARY_STATES[areaCode] ?? [])].sort(),
			);
		}
	});
});
