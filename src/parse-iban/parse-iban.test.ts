import { describe, expect, test } from "../_internals/test/runtime";
import { formatIban } from "../format-iban/format-iban";
import { isValidIban } from "../is-valid-iban/is-valid-iban";
import { parseIban } from "./parse-iban";

describe("parseIban", () => {
	describe("should return the parsed iban", () => {
		test("for a known valid IBAN (iban.com Brazil example)", () => {
			expect(parseIban("BR1500000000000010932840814P2")).toEqual({
				countryCode: "BR",
				checkDigits: "15",
				bankIspb: "00000000",
				branch: "00001",
				account: "0932840814",
				accountType: "P",
				owner: "2",
			});
		});

		test("for a value with grouping spaces", () => {
			expect(parseIban("BR15 0000 0000 0000 1093 2840 814P 2")).toEqual({
				countryCode: "BR",
				checkDigits: "15",
				bankIspb: "00000000",
				branch: "00001",
				account: "0932840814",
				accountType: "P",
				owner: "2",
			});
		});

		test("for a lowercase value", () => {
			expect(parseIban("br1500000000000010932840814p2")).toEqual({
				countryCode: "BR",
				checkDigits: "15",
				bankIspb: "00000000",
				branch: "00001",
				account: "0932840814",
				accountType: "P",
				owner: "2",
			});
		});

		test("for a valid IBAN with a corrente (C) account type", () => {
			expect(parseIban("BR3860701190000010000012345C1")).toEqual({
				countryCode: "BR",
				checkDigits: "38",
				bankIspb: "60701190",
				branch: "00001",
				account: "0000012345",
				accountType: "C",
				owner: "1",
			});
		});

		test("for a valid IBAN with a poupança (P) account type and a non zero branch", () => {
			expect(parseIban("BR1460746948000020001234567P2")).toEqual({
				countryCode: "BR",
				checkDigits: "14",
				bankIspb: "60746948",
				branch: "00002",
				account: "0001234567",
				accountType: "P",
				owner: "2",
			});
		});
	});

	describe("should return null", () => {
		test("when the check digits do not match", () => {
			expect(parseIban("BR1500000000000010932840814P3")).toBeNull();
		});

		test("when the country code is not BR", () => {
			expect(parseIban("DE89370400440532013000")).toBeNull();
		});

		test("when it is shorter than 29 characters", () => {
			expect(parseIban("BR15000000000000109328408")).toBeNull();
		});

		test("when it is longer than 29 characters", () => {
			expect(parseIban("BR1500000000000010932840814P2000")).toBeNull();
		});

		test("when the account type is not C or P", () => {
			expect(parseIban("BR1500000000000010932840814X2")).toBeNull();
		});

		test("when it is an empty string", () => {
			expect(parseIban("")).toBeNull();
		});

		test("when it is null", () => {
			// @ts-expect-error
			expect(parseIban(null)).toBeNull();
		});

		test("when it is undefined", () => {
			// @ts-expect-error
			expect(parseIban(undefined)).toBeNull();
		});

		test("when it is a number", () => {
			// @ts-expect-error
			expect(parseIban(150000000000)).toBeNull();
		});
	});

	describe("should round-trip with formatIban and isValidIban", () => {
		const IBANS = [
			"BR1500000000000010932840814P2",
			"BR3860701190000010000012345C1",
			"BR1460746948000020001234567P2",
		];

		for (const iban of IBANS) {
			test(`for ${iban}`, () => {
				expect(isValidIban(iban)).toBe(true);

				const parsed = parseIban(iban);

				expect(parsed).not.toBeNull();
				expect(
					`BR${parsed?.checkDigits}${parsed?.bankIspb}${parsed?.branch}${parsed?.account}${parsed?.accountType}${parsed?.owner}`,
				).toBe(iban);
				expect(formatIban(iban)).toBe(formatIban(iban.toUpperCase()));
			});
		}
	});
});
