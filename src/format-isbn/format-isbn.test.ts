import { anyGarbage } from "../_internals/test/arbitraries";
import { expectNeverThrows } from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatIsbn } from "./format-isbn";

describe("formatIsbn", () => {
	it("should hyphenate an ISBN by its elements", () => {
		expect(formatIsbn("9786589999010")).toBe("978-65-89999-01-0");
		expect(formatIsbn("9788533302273")).toBe("978-85-333-0227-3");
		expect(formatIsbn("9780306406157")).toBe("978-0-306-40615-7");
		expect(formatIsbn("9789295055124")).toBe("978-92-95055-12-4");
	});

	it("should read a printed value, label included, and give back the hyphenated form without it", () => {
		expect(formatIsbn("ISBN 978 85 333 0227 3")).toBe("978-85-333-0227-3");
	});

	it("should return an empty string for a partial or invalid value, or a range not assigned yet", () => {
		expect(formatIsbn("978853330227")).toBe("");
		expect(formatIsbn("9788533302274")).toBe("");
		expect(formatIsbn("")).toBe("");
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows(formatIsbn, anyGarbage);
		});
	});
});

describe("formatIsbn types", () => {
	test("should take a string and return a string", () => {
		expectTypeOf(formatIsbn).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(formatIsbn).returns.toEqualTypeOf<string>();
	});
});
