import { describe, expect, expectTypeOf, it, test } from "../test/runtime";
import { toStringSafe } from "./to-string-safe";

describe("toStringSafe", () => {
	it("should read strings and numbers as String does", () => {
		expect(toStringSafe("abc")).toBe("abc");
		expect(toStringSafe(123)).toBe("123");
		expect(toStringSafe(1.5)).toBe("1.5");
		expect(toStringSafe(12n)).toBe("12");
	});

	it("should read arrays, booleans and plain objects as String does", () => {
		expect(toStringSafe([1, 2])).toBe("1,2");
		expect(toStringSafe(true)).toBe("true");
		expect(toStringSafe({})).toBe("[object Object]");
		expect(toStringSafe(null)).toBe("null");
		// @ts-expect-error: intentionally missing argument
		expect(toStringSafe()).toBe("undefined");
	});

	it("should return an empty string for an object with a null prototype, which has no toString", () => {
		expect(toStringSafe(Object.create(null))).toBe("");
	});

	it("should return an empty string for an object whose toString throws", () => {
		const hostile = {
			toString: (): string => {
				throw new Error("no");
			},
		};

		expect(toStringSafe(hostile)).toBe("");
	});
});

describe("toStringSafe types", () => {
	test("should take unknown and return a string", () => {
		expectTypeOf(toStringSafe).parameter(0).toEqualTypeOf<unknown>();
		expectTypeOf(toStringSafe).returns.toEqualTypeOf<string>();
	});
});
