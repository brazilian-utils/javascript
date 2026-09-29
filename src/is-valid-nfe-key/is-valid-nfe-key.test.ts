import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isValidNfeKey } from "./is-valid-nfe-key";

const VALID_A = "35120859597245000190550000000095831710040056";
const VALID_B = "35170458716523000119550010000000121000123458";
const CNF_EQUAL_TO_NNF = "35170358716523000119550010000000301000000300";
const VALID_D = "43160472202112000136550000000010571048440722";
const INVALID_TYPE = "42100484684182000157550010000000020108042108";

const NFE_CHECK_DIGITS = Array.from({ length: 10 }, (_, digit) => String(digit));

const NFE_KEY = "35170458716523000119550010000000121000123458";

describe("isValidNfeKey", () => {
	describe("should return true", () => {
		test("for a real NF-e access key without a mask, the br-validate-dfe-access-key README/tests example (SP)", () => {
			expect(isValidNfeKey(VALID_A)).toBe(true);
		});

		test("for a real NF-e access key without a mask, the NFePHP `Keys::build` doc example (SP)", () => {
			expect(isValidNfeKey(VALID_B)).toBe(true);
		});

		test("for a real NF-e access key without a mask, the NFePHP sped-cte `$infNFe->chave` example (RS, NF-e referenced by a CT-e)", () => {
			expect(isValidNfeKey(VALID_D)).toBe(true);
		});

		test("when it has the NFe prefix found in the XML Id attribute", () => {
			expect(isValidNfeKey(`NFe${VALID_B}`)).toBe(true);
		});

		test("when it has the XML Id prefix of one of the other covered documents", () => {
			expect(isValidNfeKey("CTe35170458716523000119570010000000121000123455")).toBe(true);
			expect(isValidNfeKey("MDFe35170458716523000119580010000000121000123459")).toBe(true);
			expect(isValidNfeKey("BPe35170458716523000119630010000000121000123453")).toBe(true);
			expect(isValidNfeKey("NF3e35170458716523000119660010000000121000123454")).toBe(true);
			expect(isValidNfeKey("nfcom35170458716523000119620010000000121000123450")).toBe(true);
		});

		test("for the four models added beside the NF-e family: NFCom (62), BP-e (63), GTV-e (64) and NF3e (66)", () => {
			expect(isValidNfeKey("35170458716523000119620010000000121000123450")).toBe(true);
			expect(isValidNfeKey("35170458716523000119630010000000121000123453")).toBe(true);
			expect(isValidNfeKey("35170458716523000119640010000000121000123457")).toBe(true);
			expect(isValidNfeKey("35170458716523000119660010000000121000123454")).toBe(true);
		});

		test("for a CT-e, a CT-e OS and a GTV-e authorised by the SVC-SP, whose MOC assigns tpEmis 8", () => {
			expect(isValidNfeKey("35170458716523000119570010000000128000123452")).toBe(true);
			expect(isValidNfeKey("35170458716523000119670010000000128000123455")).toBe(true);
			expect(isValidNfeKey("35170458716523000119640010000000128000123454")).toBe(true);
		});

		test("when it is grouped in spaces of 4 digits", () => {
			expect(isValidNfeKey("3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458")).toBe(true);
		});

		test("when the printed groups of 4 are split by any of the mask characters", () => {
			expect(isValidNfeKey("3517.0458.7165.2300.0119.5500.1000.0000.1210.0012.3458")).toBe(true);
			expect(isValidNfeKey("3517-0458-7165-2300-0119-5500-1000-0000-1210-0012-3458")).toBe(true);
			expect(isValidNfeKey("3517/0458/7165/2300/0119/5500/1000/0000/1210/0012/3458")).toBe(true);
		});

		test("when the mask characters are mixed and a run of them separates two groups", () => {
			expect(isValidNfeKey("3517.0458-7165/2300 0119 5500 1000 0000 1210 0012 3458")).toBe(true);
			expect(isValidNfeKey("3517 - 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458")).toBe(true);
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
			// @ts-expect-error: intentionally invalid input
			expect(isValidNfeKey(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidNfeKey()).toBe(false);
		});

		test("when it is a number", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidNfeKey(123)).toBe(false);
		});

		test("when it is a boolean", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidNfeKey(true)).toBe(false);
		});

		test("when it is an object or an array", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidNfeKey({})).toBe(false);
			// @ts-expect-error: intentionally invalid input
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

		test("when it has whole groups of 4 digits but not the 44 of a key", () => {
			expect(isValidNfeKey(VALID_B.slice(0, 40))).toBe(false);
			expect(isValidNfeKey(`${VALID_B}9999`)).toBe(false);
		});

		test("when a separator falls inside a printed group of 4 digits", () => {
			expect(isValidNfeKey("351 70458716523000119550010000000121000123458")).toBe(false);
			expect(isValidNfeKey("3517 0458 7165 2300 0119 5500 1000 0000 1210 00123 458")).toBe(false);
		});

		test("when the groups are split by a character outside the mask", () => {
			expect(isValidNfeKey("3517#0458#7165#2300#0119#5500#1000#0000#1210#0012#3458")).toBe(false);
			expect(isValidNfeKey("3517,0458,7165,2300,0119,5500,1000,0000,1210,0012,3458")).toBe(false);
		});

		test("when the cUF is not a valid IBGE UF code", () => {
			expect(isValidNfeKey(`00${VALID_B.slice(2)}`)).toBe(false);
		});

		test("when the mod is not one of the nine supported", () => {
			expect(isValidNfeKey(`${VALID_B.slice(0, 20)}99${VALID_B.slice(22)}`)).toBe(false);
		});

		test("for the NFePHP `Keys::isValid` doc example, whose cNF equals its nNF (rule B03-10)", () => {
			expect(isValidNfeKey(CNF_EQUAL_TO_NNF)).toBe(false);
		});

		test("when the cNF of an NF-e is one of the codes rule B03-10 lists", () => {
			expect(isValidNfeKey("35170458716523000119550010000000121000000003")).toBe(false);
			expect(isValidNfeKey("35170458716523000119550010000000121123456781")).toBe(false);
		});

		test("when the month is not between 01 and 12", () => {
			expect(isValidNfeKey(`${VALID_B.slice(0, 4)}13${VALID_B.slice(6)}`)).toBe(false);
			expect(isValidNfeKey(`${VALID_B.slice(0, 4)}00${VALID_B.slice(6)}`)).toBe(false);
		});

		test("when tpEmis is not between 1 and 9, using the br-validate-dfe-access-key doc example with a valid check digit but tpEmis '0'", () => {
			expect(isValidNfeKey(INVALID_TYPE)).toBe(false);
		});

		test("when the check digit does not match", () => {
			const brokenCheckDigit = `${VALID_B.slice(0, 43)}${VALID_B.at(-1) === "8" ? "7" : "8"}`;
			expect(isValidNfeKey(brokenCheckDigit)).toBe(false);
		});

		test("when there is garbage before the digits, since the format is anchored at the start", () => {
			expect(isValidNfeKey(`xx${VALID_B}`)).toBe(false);
		});

		test("when there is garbage after the digits, since the format is anchored at the end", () => {
			expect(isValidNfeKey(`${VALID_B}xx`)).toBe(false);
		});
	});

	describe("with every field valid except one and the check digit recalculated for it", () => {
		const CASES: { name: string; key: string; expected: boolean }[] = [
			{
				name: "an unmapped cUF (99)",
				key: "99200600000000000000550010000000011000000129",
				expected: false,
			},
			{
				name: "month 00, below the valid range",
				key: "35200000000000000000550010000000011000000120",
				expected: false,
			},
			{
				name: "month 01, the lower boundary",
				key: "35200100000000000000550010000000011000000123",
				expected: true,
			},
			{
				name: "month 12, the upper boundary",
				key: "35201200000000000000550010000000011000000120",
				expected: true,
			},
			{
				name: "month 13, above the valid range",
				key: "35201300000000000000550010000000011000000123",
				expected: false,
			},
			{
				name: "a model not in VALID_MODELS (99)",
				key: "35200600000000000000990010000000011000000127",
				expected: false,
			},
			{
				name: "model 67, the CT-e OS instituted by the cláusula primeira of the Ajuste SINIEF 36/19",
				key: "35170458716523000119670010000000121000123458",
				expected: true,
			},
			{
				name: "tpEmis 9, the upper boundary",
				key: "35200600000000000000550010000000019000000127",
				expected: true,
			},
			{
				name: "tpEmis 8, a code the NF-e MOC does not assign",
				key: "35170458716523000119550010000000128000123455",
				expected: false,
			},
			{
				name: "tpEmis 9, the off-line NFC-e contingency",
				key: "35170458716523000119550010000000129000123453",
				expected: true,
			},
		];

		for (const { name, key, expected } of CASES) {
			test(`returns ${expected} for ${name}`, () => {
				expect(isValidNfeKey(key)).toBe(expected);
			});
		}
	});

	describe("with the alphanumeric CNPJ of NT Conjunta 2025.001 (TChNFe [0-9]{6}[0-9A-Z]{12}[0-9]{26})", () => {
		// cUF 35, AAMM 2607, CNPJ 12ABC34501DE35, mod 55, serie 001, nNF 123, tpEmis 1,
		// cNF 10203040. Check digit by hand, each character at its ASCII code minus 48 (A=17, B=18,
		// C=19, D=20, E=21), weights 2-9 from the right: the weighted sum is 756, 756 mod 11 = 8,
		// so cDV = 11 - 8 = 3.
		const ALPHANUMERIC = "35260712ABC34501DE35550010000001231102030403";

		test("should accept the key of CNPJ 12ABC34501DE35", () => {
			expect(isValidNfeKey(ALPHANUMERIC)).toBe(true);
		});

		test("should accept it masked in groups of 4 and behind the XML Id prefix", () => {
			expect(isValidNfeKey("3526 0712 ABC3 4501 DE35 5500 1000 0001 2311 0203 0403")).toBe(true);
			expect(isValidNfeKey("3526.0712.ABC3.4501.DE35.5500.1000.0001.2311.0203.0403")).toBe(true);
			expect(isValidNfeKey(`NFe${ALPHANUMERIC}`)).toBe(true);
		});

		test("should reject a separator inside a group of 4 of it", () => {
			expect(isValidNfeKey("3526 0712 AB C3 4501 DE35 5500 1000 0001 2311 0203 0403")).toBe(false);
		});

		test("should read lower case letters as upper case, the case folding isValidCnpj applies to version 2", () => {
			expect(isValidNfeKey(ALPHANUMERIC.toLowerCase())).toBe(true);
			expect(isValidNfeKey("35260712abC34501dE35550010000001231102030403")).toBe(true);
		});

		test("should reject a non-ASCII letter that upper cases into an ASCII one", () => {
			expect(isValidNfeKey("35260712ABS34501DE35550010000001231102030404")).toBe(true);
			expect(isValidNfeKey("35260712ABſ34501DE35550010000001231102030404")).toBe(false);
			expect(isValidNfeKey("35260712ABſ3 4501 DE35 5500 1000 0001 2311 0203 0404")).toBe(false);
			expect(isValidNfeKey("35260712ABß34501DE35550010000001231102030404")).toBe(false);
		});

		test("should accept a letter in position 7 and in position 18, the two ends of the CNPJ root and order", () => {
			// Same fields with A in position 7 and Z in position 18: cDV recalculated to 9.
			expect(isValidNfeKey("352607A2ABC34501DZ35550010000001231102030409")).toBe(true);
		});

		test("should reject a letter in positions 1 to 6", () => {
			// Letter in position 6 (the month) and in position 3 (the year), cDV recalculated.
			expect(isValidNfeKey("35260A12ABC34501DE35550010000001231102030400")).toBe(false);
			expect(isValidNfeKey("35A60712ABC34501DE35550010000001231102030406")).toBe(false);
		});

		test("should reject a letter in positions 19 and 20, the CNPJ check digits", () => {
			expect(isValidNfeKey("35260712ABC34501DEA5550010000001231102030408")).toBe(false);
			expect(isValidNfeKey("35260712ABC34501DE3A550010000001231102030405")).toBe(false);
		});

		test("should reject a letter after position 20, in the model or the document number", () => {
			expect(isValidNfeKey("35260712ABC34501DE35A50010000001231102030406")).toBe(false);
			expect(isValidNfeKey("35260712ABC34501DE355500100000A1231102030400")).toBe(false);
		});

		test("should accept the alphanumeric CNPJ in the key of the other models, NFCom and CT-e", () => {
			expect(isValidNfeKey("35260712ABC34501DE35620010000001231102030405")).toBe(true);
			expect(isValidNfeKey("35260712ABC34501DE35570010000001231102030400")).toBe(true);
		});

		test("should compute the check digit with the letters valued at their ASCII code minus 48", () => {
			const accepted = NFE_CHECK_DIGITS.filter((digit) =>
				isValidNfeKey(`${ALPHANUMERIC.slice(0, 43)}${digit}`),
			);

			expect(accepted).toEqual(["3"]);
		});
	});

	describe("properties", () => {
		test("should accept at most one check digit for any 43 digit base", () => {
			fc.assert(
				fc.property(fc.stringMatching(/^[0-9]{43}$/), (base) => {
					const accepted = NFE_CHECK_DIGITS.filter((digit) => isValidNfeKey(`${base}${digit}`));

					expect(accepted.length).toBeLessThanOrEqual(1);
				}),
			);
		});

		test("should ignore any mask character placed at a printed group boundary", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 1, max: 10 }),
					fc.constantFrom(" ", ".", "-", "/"),
					(group, separator) => {
						const index = group * 4;
						const masked = `${NFE_KEY.slice(0, index)}${separator}${NFE_KEY.slice(index)}`;

						expect(isValidNfeKey(masked)).toBe(true);
						expect(isValidNfeKey(`NFe${masked}`)).toBe(true);
					},
				),
			);
		});

		test("should reject a mask character placed anywhere but a printed group boundary", () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 1, max: 43 }),
					fc.constantFrom(" ", ".", "-", "/"),
					(index, separator) => {
						fc.pre(index % 4 !== 0);

						const masked = `${NFE_KEY.slice(0, index)}${separator}${NFE_KEY.slice(index)}`;

						expect(isValidNfeKey(masked)).toBe(false);
					},
				),
			);
		});

		test("should reject a key whose state code belongs to no state", () => {
			fc.assert(
				fc.property(
					fc.stringMatching(/^[0-9]{42}$/),
					fc.constantFrom("00", "01", "89", "99"),
					(rest, uf) => {
						expect(isValidNfeKey(`${uf}${rest}`)).toBe(false);
					},
				),
			);
		});

		test("should never throw and always judge an access key with a boolean", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					expect(typeof isValidNfeKey(value as string)).toBe("boolean");
				}),
			);
		});
	});
});

describe("isValidNfeKey types", () => {
	test("should take a string and return a boolean", () => {
		expectTypeOf(isValidNfeKey).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(isValidNfeKey).returns.toEqualTypeOf<boolean>();
	});
});
