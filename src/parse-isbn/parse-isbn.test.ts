import { anyGarbage } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseIsbn } from "./parse-isbn";

describe("parseIsbn", () => {
	it("should remove the hyphens and whitespace", () => {
		expect(parseIsbn("978-85-333-0227-3")).toBe("9788533302273");
		expect(parseIsbn("978 85 333 0227 3")).toBe("9788533302273");
	});

	it("should keep at most 13 digits", () => {
		expect(parseIsbn("97885333022731234")).toBe("9788533302273");
	});

	it("should return the digits of a partial value", () => {
		expect(parseIsbn("978-85")).toBe("97885");
		expect(parseIsbn("")).toBe("");
	});

	it("should return an empty string for a value that is not a string", () => {
		// @ts-expect-error: intentionally invalid input
		expect(parseIsbn(9_788_533_302_273)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(parseIsbn(null)).toBe("");
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows(parseIsbn, anyGarbage);
		});
	});
});

describe("parseIsbn types", () => {
	test("should take a string and return a string", () => {
		expectTypeOf(parseIsbn).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(parseIsbn).returns.toEqualTypeOf<string>();
	});
});
