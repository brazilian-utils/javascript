import { describe, expect, it } from "../_internals/test/runtime";
import { parseCnh } from "./parse-cnh";

describe("parseCnh", () => {
	it("should remove CNH formatting", () => {
		expect(parseCnh("000000001-19")).toBe("00000000119");
	});

	it("should remove non numeric characters", () => {
		expect(parseCnh("000.abc000001-19")).toBe("00000000119");
	});

	it("should ignore digits after the CNH length", () => {
		expect(parseCnh("00000000119123")).toBe("00000000119");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseCnh(null)).toBe("");
	});
});
