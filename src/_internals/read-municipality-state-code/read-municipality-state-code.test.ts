import { describe, expect, test } from "../test/runtime";
import { readMunicipalityStateCode } from "./read-municipality-state-code";

describe("readMunicipalityStateCode", () => {
	test("should read the state off the first two digits of a code", () => {
		expect(readMunicipalityStateCode("3550308")).toBe("SP");
		expect(readMunicipalityStateCode("5300108")).toBe("DF");
		expect(readMunicipalityStateCode("1200013")).toBe("AC");
	});

	test("should give null when the first two digits are not a state", () => {
		expect(readMunicipalityStateCode("9950308")).toBeNull();
		expect(readMunicipalityStateCode("0")).toBeNull();
		expect(readMunicipalityStateCode("")).toBeNull();
	});
});
