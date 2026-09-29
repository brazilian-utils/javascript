import { describe, expect, test } from "../test/runtime";
import { readBusinessDayRules } from "./read-business-day-rules";

describe("readBusinessDayRules", () => {
	test("should default to national holidays, optional ones counted and no Saturday", () => {
		expect(readBusinessDayRules()).toEqual({
			stateCode: undefined,
			includeOptional: true,
			includeSaturday: false,
		});
		expect(readBusinessDayRules({})).toEqual({
			stateCode: undefined,
			includeOptional: true,
			includeSaturday: false,
		});
	});

	test("should read every option given", () => {
		expect(
			readBusinessDayRules({
				stateCode: " sp " as never,
				includeOptional: false,
				includeSaturday: true,
			}),
		).toEqual({ stateCode: "SP", includeOptional: false, includeSaturday: true });
	});

	test("should return null for a state code that is not a state", () => {
		expect(readBusinessDayRules({ stateCode: "XX" as never })).toBeNull();
		expect(readBusinessDayRules({ stateCode: "" as never })).toBeNull();
		expect(readBusinessDayRules({ stateCode: 5 as never })).toBeNull();
	});
});
