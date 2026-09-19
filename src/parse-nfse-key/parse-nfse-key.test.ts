import { anyText, anyValue } from "../_internals/test/arbitraries";
import {
	expectAlwaysReturnsType,
	expectIdempotent,
	expectMatchesPattern,
} from "../_internals/test/properties";
import { describe, expect, expectTypeOf, it, test } from "../_internals/test/runtime";
import { parseNfseKey } from "./parse-nfse-key";

const KEY = "35503082258716523000119000000000001226011357924683";

describe("parseNfseKey", () => {
	it("should keep a bare access key as it is", () => {
		expect(parseNfseKey(KEY)).toBe(KEY);
	});

	it("should strip the NFS prefix of the XML Id attribute", () => {
		expect(parseNfseKey(`NFS${KEY}`)).toBe(KEY);
		expect(parseNfseKey(`  nfs${KEY}`)).toBe(KEY);
	});

	it("should remove non numeric characters", () => {
		expect(parseNfseKey("3550308 2 2 58716523000119 0000000000012 2601 135792468 3")).toBe(KEY);
		expect(parseNfseKey("3550308.2.2.58716523000119/0000000000012-2601-135792468-3")).toBe(KEY);
	});

	it("should ignore digits after the 50 of an access key", () => {
		expect(parseNfseKey(`${KEY}999`)).toBe(KEY);
	});

	it("should keep a partial access key as written", () => {
		expect(parseNfseKey("3550308 2 2")).toBe("355030822");
	});

	it("should read a number as the string of its digits", () => {
		expect(parseNfseKey(355_030_822)).toBe("355030822");
	});

	it("should return an empty string when there is no digit", () => {
		expect(parseNfseKey("NFS")).toBe("");
		expect(parseNfseKey("")).toBe("");
	});

	it("should return an empty string for null and undefined", () => {
		// @ts-expect-error not a string or number
		expect(parseNfseKey(null)).toBe("");
		// @ts-expect-error not a string or number
		expect(parseNfseKey()).toBe("");
	});

	describe("properties", () => {
		test("should return at most the digits of an access key", () => {
			expectMatchesPattern(parseNfseKey, /^\d{0,50}$/, anyText);
		});

		test("should be idempotent", () => {
			expectIdempotent(parseNfseKey, anyText);
		});

		test("should never throw and always return a string", () => {
			expectAlwaysReturnsType(parseNfseKey, "string", anyValue);
		});
	});
});

describe("parseNfseKey types", () => {
	test("should take a string or number value and return a string", () => {
		expectTypeOf(parseNfseKey).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(parseNfseKey).returns.toEqualTypeOf<string>();
	});
});
