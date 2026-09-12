import { describe, expect, it } from "../_internals/test/runtime";
import { parseLegalNature } from "./parse-legal-nature";

describe("parseLegalNature", () => {
	it("should remove legal nature formatting", () => {
		expect(parseLegalNature("206-2")).toBe("2062");
	});

	it("should ignore digits after the legal nature length", () => {
		expect(parseLegalNature("206299")).toBe("2062");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseLegalNature(null)).toBe("");
	});
});
