import * as fc from "fast-check";

import { anyGarbage, anyText } from "../_internals/test/arbitraries";
import {
	expectIdempotent,
	expectMatchesPattern,
	expectNeverThrows,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseCid10 } from "../parse-cid10/parse-cid10";
import { formatCid10 } from "./format-cid10";

describe("formatCid10", () => {
	it("should add the dot to a subcategory", () => {
		expect(formatCid10("A000")).toBe("A00.0");
		expect(formatCid10("M545")).toBe("M54.5");
	});

	it("should keep a subcategory that already has the dot", () => {
		expect(formatCid10("A00.0")).toBe("A00.0");
	});

	it("should leave a category without a dot", () => {
		expect(formatCid10("A00")).toBe("A00");
		expect(formatCid10("A00.")).toBe("A00");
	});

	it("should upper case the letter", () => {
		expect(formatCid10("f322")).toBe("F32.2");
	});

	it("should mask a partial value progressively", () => {
		expect(formatCid10("A")).toBe("A");
		expect(formatCid10("A0")).toBe("A0");
		expect(formatCid10("A00")).toBe("A00");
		expect(formatCid10("A000")).toBe("A00.0");
	});

	it("should drop the characters outside the mask", () => {
		expect(formatCid10(" A-00/0 ")).toBe("A00.0");
	});

	it("should not add characters after the subcategory length", () => {
		expect(formatCid10("A00.01")).toBe("A00.0");
		expect(formatCid10("A00012345")).toBe("A00.0");
	});

	it("should not validate whether the code exists in the official table", () => {
		expect(formatCid10("Z999")).toBe("Z99.9");
		expect(formatCid10("0A9Z")).toBe("0A9.Z");
	});

	it("should return an empty string for an empty value", () => {
		expect(formatCid10("")).toBe("");
		expect(formatCid10(" . ")).toBe("");
	});

	it("should return an empty string for a value that is not a string", () => {
		// @ts-expect-error not a string
		expect(formatCid10(null)).toBe("");
		// @ts-expect-error not a string
		expect(formatCid10()).toBe("");
		// @ts-expect-error not a string
		expect(formatCid10(1000)).toBe("");
		// @ts-expect-error not a string
		expect(formatCid10(["A000"])).toBe("");
	});

	describe("properties", () => {
		test("should never throw, regardless of the input", () => {
			expectNeverThrows(formatCid10, anyGarbage);
		});

		test("should always return a value shaped like the mask, as far as it goes", () => {
			expectMatchesPattern(formatCid10, /^(?:[A-Z0-9]{0,3}|[A-Z0-9]{3}\.[A-Z0-9])$/, anyText);
		});

		test("should be idempotent", () => {
			expectIdempotent(formatCid10, anyText);
		});

		test("should round trip with parseCid10", () => {
			expectRoundTrip(formatCid10, parseCid10, fc.stringMatching(/^[A-Z]\d{2,3}$/));
		});
	});
});

describe("formatCid10 types", () => {
	test("should take a string and return a string", () => {
		expectTypeOf(formatCid10).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(formatCid10).returns.toEqualTypeOf<string>();
	});
});
