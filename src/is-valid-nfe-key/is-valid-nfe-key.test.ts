import { describe, expect, test } from "../_internals/test/runtime";
import { isValidNfeKey } from "./is-valid-nfe-key";

const VALID_A = "35120859597245000190550000000095831710040056";
const VALID_B = "35170458716523000119550010000000121000123458";
const VALID_C = "35170358716523000119550010000000301000000300";
const VALID_D = "43160472202112000136550000000010571048440722";
const INVALID_TYPE = "42100484684182000157550010000000020108042108";

describe("isValidNfeKey", () => {
	describe("should return true", () => {
		test("for a real NF-e access key without a mask, the br-validate-dfe-access-key README/tests example (SP)", () => {
			expect(isValidNfeKey(VALID_A)).toBe(true);
		});

		test("for a real NF-e access key without a mask, the NFePHP `Keys::build` doc example (SP)", () => {
			expect(isValidNfeKey(VALID_B)).toBe(true);
		});

		test("for a real NF-e access key without a mask, the NFePHP `Keys::isValid` doc example (SP)", () => {
			expect(isValidNfeKey(VALID_C)).toBe(true);
		});

		test("for a real NF-e access key without a mask, the NFePHP sped-cte `$infNFe->chave` example (RS, NF-e referenced by a CT-e)", () => {
			expect(isValidNfeKey(VALID_D)).toBe(true);
		});

		test("when it has the NFe prefix found in the XML Id attribute", () => {
			expect(isValidNfeKey(`NFe${VALID_B}`)).toBe(true);
		});

		test("when it is grouped in spaces of 4 digits", () => {
			expect(isValidNfeKey("3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458")).toBe(true);
		});

		test("when it has the NFe prefix and a whitespace mask combined", () => {
			expect(isValidNfeKey("NFe 3512 0859 5972 4500 0190 5500 0000 0095 8317 1004 0056")).toBe(
				true,
			);
		});

		test("when it has leading whitespace before the NFe prefix, which is trimmed before the format check", () => {
			expect(isValidNfeKey(` NFe${VALID_B}`)).toBe(true);
		});
	});

	describe("should return false", () => {
		test("when the document number (positions 26 to 34) is zero, even with a matching check digit", () => {
			expect(isValidNfeKey("35170458716523000119550010000000001000123457")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error
			expect(isValidNfeKey(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error
			expect(isValidNfeKey(undefined)).toBe(false);
		});

		test("when it is a number", () => {
			// @ts-expect-error
			expect(isValidNfeKey(123)).toBe(false);
		});

		test("when it is a boolean", () => {
			// @ts-expect-error
			expect(isValidNfeKey(true)).toBe(false);
		});

		test("when it is an object or an array", () => {
			// @ts-expect-error
			expect(isValidNfeKey({})).toBe(false);
			// @ts-expect-error
			expect(isValidNfeKey([])).toBe(false);
		});

		test("when it is an empty string", () => {
			expect(isValidNfeKey("")).toBe(false);
		});

		test("when it has letters mixed with the digits", () => {
			expect(isValidNfeKey(`foo${VALID_B}bar`)).toBe(false);
		});

		test("when it does not have 44 digits", () => {
			expect(isValidNfeKey(VALID_B.slice(0, 43))).toBe(false);
			expect(isValidNfeKey(`${VALID_B}9`)).toBe(false);
		});

		test("when the cUF is not a valid IBGE UF code", () => {
			expect(isValidNfeKey(`00${VALID_B.slice(2)}`)).toBe(false);
		});

		test("when the mod is not 55, 57, 58 or 65", () => {
			expect(isValidNfeKey(`${VALID_B.slice(0, 20)}99${VALID_B.slice(22)}`)).toBe(false);
		});

		test("when the month is not between 01 and 12", () => {
			expect(isValidNfeKey(`${VALID_B.slice(0, 4)}13${VALID_B.slice(6)}`)).toBe(false);
			expect(isValidNfeKey(`${VALID_B.slice(0, 4)}00${VALID_B.slice(6)}`)).toBe(false);
		});

		test("when tpEmis is not between 1 and 9, using the br-validate-dfe-access-key doc example with a valid check digit but tpEmis '0'", () => {
			expect(isValidNfeKey(INVALID_TYPE)).toBe(false);
		});

		test("when the check digit does not match", () => {
			const brokenDv = `${VALID_B.slice(0, 43)}${VALID_B.at(-1) === "8" ? "7" : "8"}`;
			expect(isValidNfeKey(brokenDv)).toBe(false);
		});

		test("when there is garbage before the digits, since the format is anchored at the start", () => {
			expect(isValidNfeKey(`xx${VALID_B}`)).toBe(false);
		});

		test("when there is garbage after the digits, since the format is anchored at the end", () => {
			expect(isValidNfeKey(`${VALID_B}xx`)).toBe(false);
		});
	});

	describe("with every field valid except one and the check digit recalculated for it", () => {
		const CASES: Array<{ name: string; key: string; expected: boolean }> = [
			{
				name: "an unmapped cUF (99)",
				key: "99200600000000000000550010000000011000000005",
				expected: false,
			},
			{
				name: "month 00, below the valid range",
				key: "35200000000000000000550010000000011000000006",
				expected: false,
			},
			{
				name: "month 01, the lower boundary",
				key: "35200100000000000000550010000000011000000000",
				expected: true,
			},
			{
				name: "month 12, the upper boundary",
				key: "35201200000000000000550010000000011000000006",
				expected: true,
			},
			{
				name: "month 13, above the valid range",
				key: "35201300000000000000550010000000011000000000",
				expected: false,
			},
			{
				name: "a model not in VALID_MODELS (99)",
				key: "35200600000000000000990010000000011000000003",
				expected: false,
			},
			{
				name: "tpEmis 9, the upper boundary",
				key: "35200600000000000000550010000000019000000003",
				expected: true,
			},
		];

		for (const { name, key, expected } of CASES) {
			test(`returns ${expected} for ${name}`, () => {
				expect(isValidNfeKey(key)).toBe(expected);
			});
		}
	});
});
