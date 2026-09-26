import { describe, expect, expectTypeOf, test } from "../test/runtime";
import { normalizeCid10 } from "./normalize-cid10";

describe("normalizeCid10", () => {
	test("should keep a category as it is", () => {
		expect(normalizeCid10("A00")).toBe("A00");
	});

	test("should keep a subcategory written without the dot", () => {
		expect(normalizeCid10("A000")).toBe("A000");
	});

	test("should drop the dot of a subcategory", () => {
		expect(normalizeCid10("A00.0")).toBe("A000");
	});

	test("should upper case the letter", () => {
		expect(normalizeCid10("f32")).toBe("F32");
		expect(normalizeCid10("f32.2")).toBe("F322");
	});

	test("should ignore surrounding whitespace", () => {
		expect(normalizeCid10(" A00.0 ")).toBe("A000");
		expect(normalizeCid10("\tA00\n")).toBe("A00");
	});

	test("should reject whitespace inside the code", () => {
		expect(normalizeCid10("A00 0")).toBe("");
		expect(normalizeCid10("A 00")).toBe("");
	});

	test("should reject a value shorter than a category", () => {
		expect(normalizeCid10("")).toBe("");
		expect(normalizeCid10("A")).toBe("");
		expect(normalizeCid10("A0")).toBe("");
	});

	test("should reject a value longer than a subcategory", () => {
		expect(normalizeCid10("A0000")).toBe("");
		expect(normalizeCid10("A00.00")).toBe("");
		expect(normalizeCid10("XA000")).toBe("");
		expect(normalizeCid10("XA00")).toBe("");
	});

	test("should reject a dot with no subcategory after it and a doubled dot", () => {
		expect(normalizeCid10("A00.")).toBe("");
		expect(normalizeCid10("A00..0")).toBe("");
	});

	test("should reject any separator other than the dot", () => {
		expect(normalizeCid10("A00-0")).toBe("");
		expect(normalizeCid10("A00/0")).toBe("");
		expect(normalizeCid10("A00,0")).toBe("");
	});

	test("should reject a letter or a digit out of place", () => {
		expect(normalizeCid10("000")).toBe("");
		expect(normalizeCid10("0000")).toBe("");
		expect(normalizeCid10("AA0")).toBe("");
		expect(normalizeCid10("A0A")).toBe("");
		expect(normalizeCid10("A00A")).toBe("");
		expect(normalizeCid10("A00.A")).toBe("");
		expect(normalizeCid10("Á00")).toBe("");
	});

	test("should reject the dagger and asterisk suffixes", () => {
		expect(normalizeCid10("A17.0+")).toBe("");
		expect(normalizeCid10("G01*")).toBe("");
	});

	test("should reject a value that is not a string", () => {
		expect(normalizeCid10(100)).toBe("");
		expect(normalizeCid10(null)).toBe("");
		expect(normalizeCid10(true)).toBe("");
		expect(normalizeCid10(["A00"])).toBe("");
		expect(normalizeCid10({ toString: () => "A00" })).toBe("");
	});

	test("types", () => {
		expectTypeOf(normalizeCid10).parameter(0).toEqualTypeOf<unknown>();
		expectTypeOf(normalizeCid10).returns.toEqualTypeOf<string>();
	});
});
