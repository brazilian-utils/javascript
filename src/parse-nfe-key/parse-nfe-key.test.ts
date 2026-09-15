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

	it("should return an empty string for null", () => {
		// @ts-expect-error not a string or number
		expect(parseNfeKey(null)).toBe("");
	});

	describe("properties", () => {
		test("should return at most the digits of an access key", () => {
			expectMatchesPattern(parseNfeKey, /^\d{0,44}$/, anyText);
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
});

describe("parseNfeKey types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseNfeKey).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseNfeKey).returns.toEqualTypeOf<string>();
	});
});
