import * as fc from "fast-check";

import { CPF_LENGTH } from "../_internals/constants/cpf";
import { anyValue, digits, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectPadsToLength,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseCpf } from "../parse-cpf/parse-cpf";
import { formatCpf, type FormatCpfOptions } from "./format-cpf";

describe("formatCpf", () => {
	it("should return an empty string for null or undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatCpf(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatCpf()).toBe("");
	});

	it("should format CPF with mask", () => {
		expect(formatCpf("")).toBe("");
		expect(formatCpf("9")).toBe("9");
		expect(formatCpf("94")).toBe("94");
		expect(formatCpf("943")).toBe("943");
		expect(formatCpf("9438")).toBe("943.8");
		expect(formatCpf("94389")).toBe("943.89");
		expect(formatCpf("943895")).toBe("943.895");
		expect(formatCpf("9438957")).toBe("943.895.7");
		expect(formatCpf("94389575")).toBe("943.895.75");
		expect(formatCpf("943895751")).toBe("943.895.751");
		expect(formatCpf("9438957510")).toBe("943.895.751-0");
		expect(formatCpf("94389575104")).toBe("943.895.751-04");
	});

	it("should format number CPF with mask", () => {
		expect(formatCpf(9)).toBe("9");
		expect(formatCpf(94)).toBe("94");
		expect(formatCpf(943)).toBe("943");
		expect(formatCpf(9438)).toBe("943.8");
		expect(formatCpf(94_389)).toBe("943.89");
		expect(formatCpf(943_895)).toBe("943.895");
		expect(formatCpf(9_438_957)).toBe("943.895.7");
		expect(formatCpf(94_389_575)).toBe("943.895.75");
		expect(formatCpf(943_895_751)).toBe("943.895.751");
		expect(formatCpf(9_438_957_510)).toBe("943.895.751-0");
		expect(formatCpf(94_389_575_104)).toBe("943.895.751-04");
	});

	it("should format CPF with mask filling zeroes", () => {
		expect(formatCpf("", { pad: true })).toBe("000.000.000-00");
		expect(formatCpf("9", { pad: true })).toBe("000.000.000-09");
		expect(formatCpf("94", { pad: true })).toBe("000.000.000-94");
		expect(formatCpf("943", { pad: true })).toBe("000.000.009-43");
		expect(formatCpf("9438", { pad: true })).toBe("000.000.094-38");
		expect(formatCpf("94389", { pad: true })).toBe("000.000.943-89");
		expect(formatCpf("943895", { pad: true })).toBe("000.009.438-95");
		expect(formatCpf("9438957", { pad: true })).toBe("000.094.389-57");
		expect(formatCpf("94389575", { pad: true })).toBe("000.943.895-75");
		expect(formatCpf("943895751", { pad: true })).toBe("009.438.957-51");
		expect(formatCpf("9438957510", { pad: true })).toBe("094.389.575-10");
		expect(formatCpf("94389575104", { pad: true })).toBe("943.895.751-04");
	});

	it("should format number CPF with mask filling zeroes", () => {
		expect(formatCpf(9, { pad: true })).toBe("000.000.000-09");
		expect(formatCpf(94, { pad: true })).toBe("000.000.000-94");
		expect(formatCpf(943, { pad: true })).toBe("000.000.009-43");
		expect(formatCpf(9438, { pad: true })).toBe("000.000.094-38");
		expect(formatCpf(94_389, { pad: true })).toBe("000.000.943-89");
		expect(formatCpf(943_895, { pad: true })).toBe("000.009.438-95");
		expect(formatCpf(9_438_957, { pad: true })).toBe("000.094.389-57");
		expect(formatCpf(94_389_575, { pad: true })).toBe("000.943.895-75");
		expect(formatCpf(943_895_751, { pad: true })).toBe("009.438.957-51");
		expect(formatCpf(9_438_957_510, { pad: true })).toBe("094.389.575-10");
		expect(formatCpf(94_389_575_104, { pad: true })).toBe("943.895.751-04");
	});

	it(`should NOT add digits after the CPF length (${CPF_LENGTH})`, () => {
		expect(formatCpf("94389575104000000")).toBe("943.895.751-04");
	});

	it("should remove all non numeric characters", () => {
		expect(formatCpf("943.?ABC895.751-04abc")).toBe("943.895.751-04");
	});

	it("should hide the first 3 digits and the 2 check digits when obfuscate is true", () => {
		expect(formatCpf("94389575104", { obfuscate: true })).toBe("***.895.751-**");
		expect(formatCpf(94_389_575_104, { obfuscate: true })).toBe("***.895.751-**");
	});

	it("should pad before obfuscating", () => {
		expect(formatCpf("9", { pad: true, obfuscate: true })).toBe("***.000.000-**");
		expect(formatCpf("943", { pad: true, obfuscate: true })).toBe("***.000.009-**");
	});

	it("should obfuscate a short, unpadded value as far as it goes", () => {
		expect(formatCpf("9438", { obfuscate: true })).toBe("***.8");
	});

	it("should behave exactly as without the option when obfuscate is false or absent", () => {
		expect(formatCpf("94389575104", { obfuscate: false })).toBe("943.895.751-04");
		expect(formatCpf("94389575104")).toBe("943.895.751-04");
		expect(formatCpf("943", { pad: true, obfuscate: false })).toBe("000.000.009-43");
	});

	describe("properties", () => {
		const upToACpf = digitsUpTo(11);
		const fullCpf = digits(11);

		test("should only add the mask, never change the digits", () => {
			expectRoundTrip(formatCpf, parseCpf, upToACpf);
		});

		test("should produce the documented mask shape for a full CPF", () => {
			fc.assert(
				fc.property(fullCpf, (value) => {
					const obfuscated = formatCpf(value, { obfuscate: true });

					expect(formatCpf(value)).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
					expect(obfuscated).toMatch(/^\*{3}\.\d{3}\.\d{3}-\*{2}$/);
				}),
			);
		});

		test("should left pad a shorter value up to the CPF length", () => {
			expectPadsToLength(formatCpf, parseCpf, upToACpf, CPF_LENGTH);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(formatCpf, "string", anyValue);
		});
	});
});

describe("formatCpf types", () => {
	test("should take a string or number value and options and return a string", () => {
		expectTypeOf(formatCpf).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatCpf).parameter(1).toEqualTypeOf<FormatCpfOptions | undefined>();
		expectTypeOf(formatCpf).returns.toEqualTypeOf<string>();
	});

	test("should type the pad and obfuscate options as optional booleans", () => {
		expectTypeOf<FormatCpfOptions["pad"]>().toEqualTypeOf<boolean | undefined>();
		expectTypeOf<FormatCpfOptions["obfuscate"]>().toEqualTypeOf<boolean | undefined>();
	});
});
