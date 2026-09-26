import { SUFRAMA_LENGTH } from "../_internals/constants/suframa";
import { anyValue, digits, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectMatchesPattern,
	expectPadsToLength,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseSuframa } from "../parse-suframa/parse-suframa";
import { formatSuframa, type FormatSuframaOptions } from "./format-suframa";

describe("formatSuframa", () => {
	it("should format the example of the NF-e manual", () => {
		expect(formatSuframa("123456789")).toBe("12.3456.789");
	});

	it("when it is a no formatted string", () => {
		expect(formatSuframa("")).toBe("");
		expect(formatSuframa("2")).toBe("2");
		expect(formatSuframa("20")).toBe("20");
		expect(formatSuframa("205")).toBe("20.5");
		expect(formatSuframa("2056")).toBe("20.56");
		expect(formatSuframa("20567")).toBe("20.567");
		expect(formatSuframa("205678")).toBe("20.5678");
		expect(formatSuframa("2056781")).toBe("20.5678.1");
		expect(formatSuframa("20567810")).toBe("20.5678.10");
		expect(formatSuframa("205678106")).toBe("20.5678.106");
	});

	it("when it is a formatted string", () => {
		expect(formatSuframa("20.5")).toBe("20.5");
		expect(formatSuframa("20.5678")).toBe("20.5678");
		expect(formatSuframa("20.56781")).toBe("20.5678.1");
		expect(formatSuframa("20.5678.106")).toBe("20.5678.106");
		expect(formatSuframa("20.5678.10-6")).toBe("20.5678.106");
	});

	it("when it is a malformed string", () => {
		expect(formatSuframa("20#Error*&@#5678#Char!106")).toBe("20.5678.106");
		expect(formatSuframa("#-+Error#205678106#Char!")).toBe("20.5678.106");
	});

	it("when it is a number", () => {
		expect(formatSuframa(1)).toBe("1");
		expect(formatSuframa(205)).toBe("20.5");
		expect(formatSuframa(205_678_106)).toBe("20.5678.106");
		expect(formatSuframa(10_001_018)).toBe("10.0010.18");
	});

	it("should left pad with zeros when the pad option is set", () => {
		expect(formatSuframa("10001018", { pad: true })).toBe("01.0001.018");
		expect(formatSuframa(10_001_018, { pad: true })).toBe("01.0001.018");
		expect(formatSuframa("1", { pad: true })).toBe("00.0000.001");
		expect(formatSuframa("205678106", { pad: true })).toBe("20.5678.106");
	});

	it("should not pad when the pad option is false", () => {
		expect(formatSuframa("10001018", { pad: false })).toBe("10.0010.18");
	});

	it(`should NOT add digits after the Inscrição SUFRAMA length (${SUFRAMA_LENGTH})`, () => {
		expect(formatSuframa("2056781069")).toBe("20.5678.106");
		expect(formatSuframa("205678106999")).toBe("20.5678.106");
	});

	it("should return an empty string for null or undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatSuframa(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatSuframa()).toBe("");
	});

	describe("properties", () => {
		const upToASuframa = digitsUpTo(9);

		test("should only add the mask, never change the digits", () => {
			expectRoundTrip(formatSuframa, parseSuframa, upToASuframa);
		});

		test("should produce the documented mask shape for a full Inscrição SUFRAMA", () => {
			expectMatchesPattern(formatSuframa, /^\d{2}\.\d{4}\.\d{3}$/, digits(9));
		});

		test("should left pad a shorter value up to the Inscrição SUFRAMA length", () => {
			expectPadsToLength(formatSuframa, parseSuframa, upToASuframa, SUFRAMA_LENGTH);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(formatSuframa, "string", anyValue);
		});
	});
});

describe("formatSuframa types", () => {
	test("should take a string or number value and options and return a string", () => {
		expectTypeOf(formatSuframa).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatSuframa).parameter(1).toEqualTypeOf<FormatSuframaOptions | undefined>();
		expectTypeOf(formatSuframa).returns.toEqualTypeOf<string>();
	});

	test("should type the pad option as an optional boolean", () => {
		expectTypeOf<FormatSuframaOptions["pad"]>().toEqualTypeOf<boolean | undefined>();
	});
});
