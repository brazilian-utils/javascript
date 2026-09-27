import { NFE_KEY_LENGTH } from "../_internals/constants/nfe-key";
import { anyText, anyValue, digitsUpTo } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
	expectRoundTrip,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { formatNfeKey } from "../format-nfe-key/format-nfe-key";
import { parseNfeKey } from "./parse-nfe-key";

const KEY = "35170458716523000119550010000000121000123458";

describe("parseNfeKey", () => {
	it("should remove the printed grouping of an access key", () => {
		expect(parseNfeKey("3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458")).toBe(KEY);
	});

	it("should remove non numeric characters", () => {
		expect(parseNfeKey("3517.0458.7165.2300.0119.5500.1000.0000.1210.0012.3458")).toBe(KEY);
	});

	it("should strip the XML Id prefix of every document", () => {
		expect(parseNfeKey(`NFe${KEY}`)).toBe(KEY);
		expect(parseNfeKey(`CTe${KEY}`)).toBe(KEY);
		expect(parseNfeKey(`MDFe${KEY}`)).toBe(KEY);
		expect(parseNfeKey(`BPe${KEY}`)).toBe(KEY);
		expect(parseNfeKey(`NFCom${KEY}`)).toBe(KEY);
	});

	it("should strip the NF3e prefix instead of reading its digit as part of the key", () => {
		expect(parseNfeKey(`NF3e${KEY}`)).toBe(KEY);
	});

	it("should strip the XML Id prefix behind leading whitespace", () => {
		expect(parseNfeKey(`  NF3e${KEY}`)).toBe(KEY);
	});

	it(`should ignore digits after the access key length (${NFE_KEY_LENGTH})`, () => {
		expect(parseNfeKey(`${KEY}999`)).toBe(KEY);
	});

	it("should keep a partial access key as written", () => {
		expect(parseNfeKey("3517 0458")).toBe("35170458");
	});

	describe("with the alphanumeric CNPJ of NT Conjunta 2025.001", () => {
		const ALPHANUMERIC = "35260712ABC34501DE35550010000001231102030403";

		it("should keep the letters in positions 7 to 18 instead of dropping them", () => {
			expect(parseNfeKey("3526 0712 ABC3 4501 DE35 5500 1000 0001 2311 0203 0403")).toBe(
				ALPHANUMERIC,
			);
			expect(parseNfeKey(`NFe${ALPHANUMERIC}`)).toBe(ALPHANUMERIC);
		});

		it("should upper case them", () => {
			expect(parseNfeKey(ALPHANUMERIC.toLowerCase())).toBe(ALPHANUMERIC);
		});

		it("should drop a letter in positions 1 to 6 and from position 19 on", () => {
			expect(parseNfeKey("35260A")).toBe("35260");
			expect(parseNfeKey("35260712ABC34501DEA5")).toBe("35260712ABC34501DE5");
		});

		it("should undo formatNfeKey", () => {
			expect(parseNfeKey(formatNfeKey(ALPHANUMERIC))).toBe(ALPHANUMERIC);
		});
	});

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseNfeKey(null)).toBe("");
	});

	describe("properties", () => {
		test("should return at most the 44 characters of an access key, letters only in positions 7 to 18", () => {
			expectMatchesPattern(
				parseNfeKey,
				/^(?:\d{0,6}|\d{6}[0-9A-Z]{1,12}|\d{6}[0-9A-Z]{12}\d{1,26})$/,
				anyText,
			);
		});

		test("should undo formatNfeKey", () => {
			expectRoundTrip(formatNfeKey, parseNfeKey, digitsUpTo(NFE_KEY_LENGTH));
		});

		test("should be idempotent", () => {
			expectIdempotent(parseNfeKey, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseNfeKey, "string", anyValue);
		});
	});

	test("when it is a negative, fractional or unsafe number", () => {
		expect(parseNfeKey(-1)).toBe("");
		expect(parseNfeKey(1.5)).toBe("");
		expect(parseNfeKey(2 ** 53)).toBe("");
		expect(parseNfeKey(Number.MAX_VALUE)).toBe("");
		expect(parseNfeKey(1e21)).toBe("");
		expect(parseNfeKey(Number.NaN)).toBe("");
		expect(parseNfeKey(Number.POSITIVE_INFINITY)).toBe("");
		expect(parseNfeKey(Number.NEGATIVE_INFINITY)).toBe("");
	});
});

describe("parseNfeKey types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseNfeKey).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseNfeKey).returns.toEqualTypeOf<string>();
	});
});
