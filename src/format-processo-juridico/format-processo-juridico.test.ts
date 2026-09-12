import { PROCESSO_JURIDICO_LENGTH } from "../_internals/constants/processo-juridico";
import { anyValue, digits, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectMatchesPattern,
	expectPadsToLength,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseProcessoJuridico } from "../parse-processo-juridico/parse-processo-juridico";
import {
	formatProcessoJuridico,
	type FormatProcessoJuridicoOptions,
} from "./format-processo-juridico";

describe("formatProcessoJuridico", () => {
	it("should format processo juridico with mask", () => {
		expect(formatProcessoJuridico("")).toBe("");
		expect(formatProcessoJuridico("0")).toBe("0");
		expect(formatProcessoJuridico("00")).toBe("00");
		expect(formatProcessoJuridico("000")).toBe("000");
		expect(formatProcessoJuridico("0002")).toBe("0002");
		expect(formatProcessoJuridico("00020")).toBe("00020");
		expect(formatProcessoJuridico("000208")).toBe("000208");
		expect(formatProcessoJuridico("0002080")).toBe("0002080");
		expect(formatProcessoJuridico("00020802")).toBe("0002080-2");
		expect(formatProcessoJuridico("000208025")).toBe("0002080-25");
		expect(formatProcessoJuridico("0002080252")).toBe("0002080-25.2");
		expect(formatProcessoJuridico("00020802520")).toBe("0002080-25.20");
		expect(formatProcessoJuridico("000208025201")).toBe("0002080-25.201");
		expect(formatProcessoJuridico("0002080252012")).toBe("0002080-25.2012");
		expect(formatProcessoJuridico("00020802520125")).toBe("0002080-25.2012.5");
		expect(formatProcessoJuridico("000208025201251")).toBe("0002080-25.2012.5.1");
		expect(formatProcessoJuridico("0002080252012515")).toBe("0002080-25.2012.5.15");
		expect(formatProcessoJuridico("00020802520125150")).toBe("0002080-25.2012.5.15.0");
		expect(formatProcessoJuridico("000208025201251500")).toBe("0002080-25.2012.5.15.00");
		expect(formatProcessoJuridico("0002080252012515004")).toBe("0002080-25.2012.5.15.004");
		expect(formatProcessoJuridico("00020802520125150049")).toBe("0002080-25.2012.5.15.0049");
	});

	it("should follow the NNNNNNN-DD.AAAA.J.TR.OOOO pattern from Resolução CNJ 65/2008, keeping J (the Judiciary branch) and TR (tribunal) as separate fields", () => {
		expect(formatProcessoJuridico("00020802520125150049")).toBe("0002080-25.2012.5.15.0049");
	});

	it(`should NOT add digits after the processo juridico length (${PROCESSO_JURIDICO_LENGTH})`, () => {
		expect(formatProcessoJuridico("00020802520125150049123123")).toBe("0002080-25.2012.5.15.0049");
	});

	it("should remove all non numeric characters", () => {
		expect(formatProcessoJuridico("0002080@$25201%!@2515.%0049123123")).toBe(
			"0002080-25.2012.5.15.0049",
		);
	});

	it("should return an empty string for null or undefined", () => {
		// @ts-expect-error: intentionally invalid input
		expect(formatProcessoJuridico(null)).toBe("");
		// @ts-expect-error: intentionally invalid input
		expect(formatProcessoJuridico()).toBe("");
	});

	describe("properties", () => {
		const upToANumber = digitsUpTo(20);

		test("should only add the mask, never change the digits", () => {
			expectRoundTrip(formatProcessoJuridico, parseProcessoJuridico, upToANumber);
		});

		test("should produce the documented mask shape for a full number", () => {
			const shape = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

			expectMatchesPattern(formatProcessoJuridico, shape, digits(20));
		});

		test("should left pad a shorter value up to the documented length", () => {
			expectPadsToLength(
				formatProcessoJuridico,
				parseProcessoJuridico,
				upToANumber,
				PROCESSO_JURIDICO_LENGTH,
			);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(formatProcessoJuridico, "string", anyValue);
		});
	});
});

describe("formatProcessoJuridico types", () => {
	test("should take a string or number value and options and return a string", () => {
		expectTypeOf(formatProcessoJuridico).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(formatProcessoJuridico)
			.parameter(1)
			.toEqualTypeOf<FormatProcessoJuridicoOptions | undefined>();
		expectTypeOf(formatProcessoJuridico).returns.toEqualTypeOf<string>();
	});

	test("should type the pad option as an optional boolean", () => {
		expectTypeOf<FormatProcessoJuridicoOptions["pad"]>().toEqualTypeOf<boolean | undefined>();
	});
});
