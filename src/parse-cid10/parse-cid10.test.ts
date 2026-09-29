import { anyGarbage, anyText, asciiAlphanumericText } from "../_internals/test/arbitraries";
import {
	expectCaseInsensitive,
	expectIdempotent,
	expectMatchesPattern,
	expectNeverThrows,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseCid10 } from "./parse-cid10";

describe("parseCid10", () => {
	it("should remove the dot of a subcategory", () => {
		expect(parseCid10("A00.0")).toBe("A000");
	});

	it("should keep a code that has no dot", () => {
		expect(parseCid10("A000")).toBe("A000");
		expect(parseCid10("A00")).toBe("A00");
	});

	it("should upper case the letter", () => {
		expect(parseCid10("f32.2")).toBe("F322");
	});

	it("should drop every character that is not a letter or a digit", () => {
		expect(parseCid10(" A-0/0.0 ")).toBe("A000");
	});

	it("should pass a partial value through", () => {
		expect(parseCid10("A")).toBe("A");
		expect(parseCid10("A0")).toBe("A0");
		expect(parseCid10("A00.")).toBe("A00");
	});

	it("should cap the result at the 4 characters of a subcategory", () => {
		expect(parseCid10("A00.01")).toBe("A000");
		expect(parseCid10("A00012345")).toBe("A000");
	});

	it("should not validate whether the code exists in the official table", () => {
		expect(parseCid10("0A.9Z")).toBe("0A9Z");
	});

	it("should return an empty string for an empty value", () => {
		expect(parseCid10("")).toBe("");
		expect(parseCid10(" . ")).toBe("");
	});

	it("should return an empty string for a value that is not a string", () => {
		// @ts-expect-error not a string
		expect(parseCid10(null)).toBe("");
		// @ts-expect-error not a string
		expect(parseCid10()).toBe("");
		// @ts-expect-error not a string
		expect(parseCid10(1000)).toBe("");
		// @ts-expect-error not a string
		expect(parseCid10(["A000"])).toBe("");
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows(parseCid10, anyGarbage);
		});

		test("should always return up to 4 upper case letters and digits", () => {
			expectMatchesPattern(parseCid10, /^[A-Z0-9]{0,4}$/, anyText);
		});

		test("should be idempotent", () => {
			expectIdempotent(parseCid10, anyText);
		});

		test("should ignore the case of an ascii alphanumeric value", () => {
			expectCaseInsensitive(parseCid10, asciiAlphanumericText);
		});
	});
});

describe("parseCid10 types", () => {
	test("should take a string and return a string", () => {
		expectTypeOf(parseCid10).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(parseCid10).returns.toEqualTypeOf<string>();
	});
});
