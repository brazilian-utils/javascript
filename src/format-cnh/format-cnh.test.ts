import { anyValue, digits, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectMatchesPattern,
	expectPadsToLength,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseCnh } from "../parse-cnh/parse-cnh";
import { formatCnh, type FormatCnhOptions } from "./format-cnh";

describe("formatCnh", () => {
	it("should format CNH values", () => {
		expect(formatCnh("")).toBe("");
		expect(formatCnh("0")).toBe("0");
		expect(formatCnh("00")).toBe("00");
		expect(formatCnh("000")).toBe("000");
		expect(formatCnh("0000")).toBe("0000");
		expect(formatCnh("00000")).toBe("00000");
		expect(formatCnh("000000")).toBe("000000");
		expect(formatCnh("0000000")).toBe("0000000");
		expect(formatCnh("00000000")).toBe("00000000");
		expect(formatCnh("000000001")).toBe("000000001");
		expect(formatCnh("0000000011")).toBe("000000001-1");
		expect(formatCnh("00000000119")).toBe("000000001-19");
	});

	it("should remove non numeric characters", () => {
		expect(formatCnh("000.000.001-19")).toBe("000000001-19");
	});

	it("should return an empty string for null or undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatCnh(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatCnh()).toBe("");
	});

	it("should hide the first 3 digits and the 2 check digits when obfuscate is truthy", () => {
		expect(formatCnh("98765432119", { obfuscate: true })).toBe("***654321-**");
		expect(formatCnh(98_765_432_119, { obfuscate: true })).toBe("***654321-**");
		expect(formatCnh("9876", { obfuscate: true })).toBe("***6");
		expect(formatCnh("9876", { pad: true, obfuscate: true })).toBe("***000098-**");
		// @ts-expect-error: intentionally not a boolean
		expect(formatCnh("98765432119", { obfuscate: "yes" })).toBe("***654321-**");
	});

	it("should behave exactly as without the option when obfuscate is falsy", () => {
		expect(formatCnh("98765432119", { obfuscate: false })).toBe("987654321-19");
		// @ts-expect-error: intentionally not a boolean
		expect(formatCnh("9876", { pad: true, obfuscate: "" })).toBe("000000098-76");
	});

	describe("properties", () => {
		const upToACnh = digitsUpTo(11);

		test("should only add the mask, never change the digits", () => {
			expectRoundTrip(formatCnh, parseCnh, upToACnh);
		});

		test("should produce the documented mask shape for a full CNH", () => {
			expectMatchesPattern(formatCnh, /^\d{9}-\d{2}$/, digits(11));
		});

		test("should produce the documented obfuscated shape for a full CNH", () => {
			expectMatchesPattern(
				(value: string) => formatCnh(value, { obfuscate: true }),
				/^\*{3}\d{6}-\*{2}$/,
				digits(11),
			);
		});

		test("should left pad a shorter value up to the CNH length", () => {
			expectPadsToLength(formatCnh, parseCnh, upToACnh, 11);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(formatCnh, "string", anyValue);
		});
	});
});

describe("formatCnh types", () => {
	test("should take a string or number value and options and return a string", () => {
		expectTypeOf(formatCnh).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatCnh).parameter(1).toEqualTypeOf<FormatCnhOptions | undefined>();
		expectTypeOf(formatCnh).returns.toEqualTypeOf<string>();
	});

	test("should type the pad and obfuscate options as optional booleans", () => {
		expectTypeOf<FormatCnhOptions["pad"]>().toEqualTypeOf<boolean | undefined>();
		expectTypeOf<FormatCnhOptions["obfuscate"]>().toEqualTypeOf<boolean | undefined>();
	});
});
