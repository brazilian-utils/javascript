import { describe, expect, it } from "../test/runtime";
import { sanitizeToAlphanumeric } from "./sanitize-to-alphanumeric";

describe("sanitizeToAlphanumeric", () => {
	it("should remove non alphanumeric characters and uppercase the result", () => {
		expect(sanitizeToAlphanumeric("ab-12.3")).toBe("AB123");
	});

	it("should support number input", () => {
		expect(sanitizeToAlphanumeric(12_345)).toBe("12345");
	});
});
