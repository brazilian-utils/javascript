import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { formatIban } from "../format-iban/format-iban";
import { isValidIban } from "../is-valid-iban/is-valid-iban";
import { parseIban, type Iban } from "./parse-iban";

const findBrazilianIban = (body: string): string => {
	for (let pair = 0; pair < 97; pair++) {
		const candidate = `BR${String(pair).padStart(2, "0")}${body}`;

		if (isValidIban(candidate)) return candidate;
	}

	return "";
};

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
			// @ts-expect-error: intentionally invalid input
			expect(parseIban(null)).toBeNull();
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(parseIban()).toBeNull();
		});

		test("when it is a number", () => {
			// @ts-expect-error: intentionally invalid input
			expect(parseIban(150_000_000_000)).toBeNull();
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

	describe("properties", () => {
		const bodies = fc.stringMatching(/^[0-9]{23}[CP][A-Z0-9]$/);

		test("should split an IBAN into fields that spell it back", () => {
			fc.assert(
				fc.property(bodies, (body) => {
					const iban = findBrazilianIban(body);
					const parsed = parseIban(formatIban(iban));
					const account = `${parsed?.bankIspb}${parsed?.branch}${parsed?.account}`;
					const owner = `${parsed?.accountType}${parsed?.owner}`;

					expect(`${parsed?.countryCode}${parsed?.checkDigits}${account}${owner}`).toBe(iban);
				}),
			);
		});

		test("should return a value exactly when the IBAN is valid", () => {
			fc.assert(
				fc.property(fc.string({ unit: "grapheme" }), (value) => {
					expect(parseIban(value) !== null).toBe(isValidIban(value));
				}),
			);
		});

		test("should never throw and always return an IBAN or null", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					const parsed = parseIban(value as string);

					expect(parsed === null || parsed.countryCode === "BR").toBe(true);
				}),
			);
		});
	});
});

describe("parseIban types", () => {
	test("should take a string and return an Iban or null", () => {
		expectTypeOf(parseIban).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(parseIban).returns.toEqualTypeOf<Iban | null>();
		expectTypeOf<Iban>().toEqualTypeOf<{
			countryCode: "BR";
			checkDigits: string;
			bankIspb: string;
			branch: string;
			account: string;
			accountType: "C" | "P";
			owner: string;
		}>();
	});
});
