import { describe, expect, it } from "../_internals/test/runtime";
import { parseLicensePlate } from "./parse-license-plate";

describe("parseLicensePlate", () => {
	it("should remove formatting and normalize casing", () => {
		expect(parseLicensePlate("abc-1234")).toBe("ABC1234");
		expect(parseLicensePlate("abc1d23")).toBe("ABC1D23");
	});

	it("should ignore characters after the license plate length", () => {
		expect(parseLicensePlate("abc123456")).toBe("ABC1234");
		expect(parseLicensePlate("abc1d23xyz")).toBe("ABC1D23");
	});

	it("should return an empty string for a non-string value", () => {
		// @ts-expect-error not a string
		expect(parseLicensePlate(null)).toBe("");
	});
});
