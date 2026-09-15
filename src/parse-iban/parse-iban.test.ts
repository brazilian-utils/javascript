import * as fc from "fast-check";

import { BR_IBAN_LENGTH } from "../_internals/constants/iban";
import { anyText, anyValue, asciiAlphanumericText } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectCaseInsensitive,
	expectIdempotent,
	expectMatchesPattern,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatIban } from "../format-iban/format-iban";
import { parseIban } from "./parse-iban";

describe("parseIban", () => {
	it("should remove the ISO 13616 print grouping", () => {
		expect(parseIban("BR15 0000 0000 0000 1093 2840 814P 2")).toBe("BR1500000000000010932840814P2");
	});

	it("should uppercase the letters and drop every other character", () => {
		expect(parseIban("br15-0000.0000/0000 1093 2840 814p-2")).toBe("BR1500000000000010932840814P2");
	});

	it(`should ignore characters after the Brazilian IBAN length (${BR_IBAN_LENGTH})`, () => {
		expect(parseIban("BR1500000000000010932840814P2EXTRA")).toBe("BR1500000000000010932840814P2");
	});

	it("should keep a partial IBAN as written", () => {
		expect(parseIban("BR15")).toBe("BR15");
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseIban(null)).toBe("");
	});

	describe("properties", () => {
		const upToAnIban = fc.stringMatching(/^[0-9A-Z]{0,29}$/);

		test("should return at most the characters of a Brazilian IBAN", () => {
			expectMatchesPattern(parseIban, /^[0-9A-Z]{0,29}$/, anyText);
		});

		test("should undo formatIban", () => {
			expectRoundTrip(formatIban, parseIban, upToAnIban);
		});

		test("should be idempotent", () => {
			expectIdempotent(parseIban, anyText);
		});

		test("should ignore the case of an ascii alphanumeric value", () => {
			expectCaseInsensitive(parseIban, asciiAlphanumericText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseIban, "string", anyValue);
		});
	});
});

describe("parseIban types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseIban).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseIban).returns.toEqualTypeOf<string>();
	});
});
