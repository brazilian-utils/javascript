import { PIS_LENGTH } from "../_internals/constants/pis";
import { anyValue, digits, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectMatchesPattern,
	expectPadsToLength,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parsePis } from "../parse-pis/parse-pis";
import { formatPis, type FormatPisOptions } from "./format-pis";

describe("formatPis", () => {
	it("when it is a no formatted string", () => {
		expect(formatPis("")).toBe("");
		expect(formatPis("0")).toBe("0");
		expect(formatPis("00")).toBe("00");
		expect(formatPis("000")).toBe("000");
		expect(formatPis("0000")).toBe("000.0");
		expect(formatPis("00000")).toBe("000.00");
		expect(formatPis("000000")).toBe("000.000");
		expect(formatPis("0000000")).toBe("000.0000");
		expect(formatPis("00000000")).toBe("000.00000");
		expect(formatPis("000000000")).toBe("000.00000.0");
		expect(formatPis("0000000000")).toBe("000.00000.00");
		expect(formatPis("00000000000")).toBe("000.00000.00-0");
		expect(formatPis("000000000000")).toBe("000.00000.00-0");
	});

	it("when it is a formatted string", () => {
		expect(formatPis("000.0")).toBe("000.0");
		expect(formatPis("000.00")).toBe("000.00");
		expect(formatPis("000.000")).toBe("000.000");
		expect(formatPis("000.0000")).toBe("000.0000");
		expect(formatPis("000.00000")).toBe("000.00000");
		expect(formatPis("000.000000")).toBe("000.00000.0");
		expect(formatPis("000.00000.0")).toBe("000.00000.0");
		expect(formatPis("000.00000.00")).toBe("000.00000.00");
		expect(formatPis("000.00000.000")).toBe("000.00000.00-0");
		expect(formatPis("000.00000.00-0")).toBe("000.00000.00-0");
		expect(formatPis("000.00000.00-00")).toBe("000.00000.00-0");
	});

	it("when it is a malformed string", () => {
		expect(formatPis("000#Error*&@#0000#Char!00000")).toBe("000.00000.00-0");
		expect(formatPis("#-+Error#000000000000#Char!")).toBe("000.00000.00-0");
		expect(formatPis("000000#+_Error#Char!$#000000")).toBe("000.00000.00-0");
	});

	it("when it is a integer number", () => {
		expect(formatPis(1)).toBe("1");
		expect(formatPis(10)).toBe("10");
		expect(formatPis(100)).toBe("100");
		expect(formatPis(1000)).toBe("100.0");
		expect(formatPis(10_000)).toBe("100.00");
		expect(formatPis(100_000)).toBe("100.000");
		expect(formatPis(1_000_000)).toBe("100.0000");
		expect(formatPis(10_000_000)).toBe("100.00000");
		expect(formatPis(100_000_000)).toBe("100.00000.0");
		expect(formatPis(1_000_000_000)).toBe("100.00000.00");
		expect(formatPis(10_000_000_000)).toBe("100.00000.00-0");
		expect(formatPis(100_000_000_000)).toBe("100.00000.00-0");
		expect(formatPis(1_000_000_000_000)).toBe("100.00000.00-0");
	});

	it("when it is a float number", () => {
		expect(formatPis(1)).toBe("1");
		expect(formatPis(10)).toBe("10");
		expect(formatPis(100)).toBe("100");
		expect(formatPis(100.1)).toBe("100.1");
		expect(formatPis(100.11)).toBe("100.11");
		expect(formatPis(100.101)).toBe("100.101");
		expect(formatPis(100.1001)).toBe("100.1001");
		expect(formatPis(100.10001)).toBe("100.10001");
		expect(formatPis(100.100001)).toBe("100.10000.1");
		expect(formatPis(100.1000001)).toBe("100.10000.01");
		expect(formatPis(100.10000001)).toBe("100.10000.00-1");
		expect(formatPis(100.100000001)).toBe("100.10000.00-0");
	});

	it(`should NOT add digits after the PIS length (${PIS_LENGTH})`, () => {
		expect(formatPis("0000000000000")).toBe("000.00000.00-0");
		expect(formatPis("00000000000000")).toBe("000.00000.00-0");
		expect(formatPis("000000000000000")).toBe("000.00000.00-0");
	});

	it("should return an empty string for null or undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatPis(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatPis()).toBe("");
	});

	describe("properties", () => {
		const upToAPis = digitsUpTo(11);

		test("should only add the mask, never change the digits", () => {
			expectRoundTrip(formatPis, parsePis, upToAPis);
		});

		test("should produce the documented mask shape for a full PIS", () => {
			expectMatchesPattern(formatPis, /^\d{3}\.\d{5}\.\d{2}-\d$/, digits(11));
		});

		test("should left pad a shorter value up to the PIS length", () => {
			expectPadsToLength(formatPis, parsePis, upToAPis, PIS_LENGTH);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(formatPis, "string", anyValue);
		});
	});
});

describe("formatPis types", () => {
	test("should take a string or number value and options and return a string", () => {
		expectTypeOf(formatPis).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatPis).parameter(1).toEqualTypeOf<FormatPisOptions | undefined>();
		expectTypeOf(formatPis).returns.toEqualTypeOf<string>();
	});

	test("should type the pad option as an optional boolean", () => {
		expectTypeOf<FormatPisOptions["pad"]>().toEqualTypeOf<boolean | undefined>();
	});
});
