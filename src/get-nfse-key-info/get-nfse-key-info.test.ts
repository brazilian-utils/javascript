import * as fc from "fast-check";

import { IBGE_UF_CODES } from "../_internals/constants/ibge-uf-codes";
import { type GENERATOR_ENVIRONMENTS } from "../_internals/constants/nfse-key";
import { type StateCode } from "../_internals/constants/states";
import { anyText } from "../_internals/test/arbitraries";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { isValidNfseKey } from "../is-valid-nfse-key/is-valid-nfse-key";
import {
	getNfseKeyInfo,
	type NfseKeyGeneratorEnvironment,
	type NfseKeyInfo,
	type NfseKeyTaxIdType,
} from "./get-nfse-key-info";

const KEY_SP = "35503082258716523000119000000000001226011357924683";
const KEY_RS = "43149021100040364478829000000000105725120484407255";

const CHECK_DIGITS = Array.from({ length: 10 }, (_, digit) => String(digit));

const ISSUERS: { type: string; registration: string; taxIdType: string; taxId: string }[] = [
	{ type: "1", registration: "00040364478829", taxIdType: "cpf", taxId: "40364478829" },
	{ type: "2", registration: "58716523000119", taxIdType: "cnpj", taxId: "58716523000119" },
	{ type: "2", registration: "00000000000191", taxIdType: "cnpj", taxId: "00000000000191" },
];

const expectedCheckDigit = (body: string): number => {
	let sum = 0;
	let weight = 2;

	for (let index = body.length - 1; index >= 0; index -= 1) {
		sum += Number(body.charAt(index)) * weight;
		weight = weight === 9 ? 2 : weight + 1;
	}

	const remainder = sum % 11;

	return remainder < 2 ? 0 : 11 - remainder;
};

describe("getNfseKeyInfo", () => {
	describe("should return null", () => {
		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getNfseKeyInfo(null)).toBeNull();
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getNfseKeyInfo()).toBeNull();
		});

		test("when it is a number", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getNfseKeyInfo(123)).toBeNull();
		});

		test("when it is an empty string", () => {
			expect(getNfseKeyInfo("")).toBeNull();
		});

		test("when it is otherwise not a key", () => {
			expect(getNfseKeyInfo("not-a-key")).toBeNull();
		});

		test("when it does not have 50 digits", () => {
			expect(getNfseKeyInfo(KEY_SP.slice(0, 49))).toBeNull();
			expect(getNfseKeyInfo(`${KEY_SP}3`)).toBeNull();
		});

		test("when there is anything before or after the 50 digits", () => {
			expect(getNfseKeyInfo(`x${KEY_SP}`)).toBeNull();
			expect(getNfseKeyInfo(`${KEY_SP}x`)).toBeNull();
			expect(getNfseKeyInfo(`NFSe${KEY_SP}`)).toBeNull();
		});

		test("when it is split by separators, since the key has no mask", () => {
			expect(
				getNfseKeyInfo("3550308 2 2 58716523000119 0000000000012 2601 135792468 3"),
			).toBeNull();
			expect(getNfseKeyInfo(`NFS ${KEY_SP}`)).toBeNull();
		});

		test("when the check digit does not match", () => {
			expect(getNfseKeyInfo("35503082258716523000119000000000001226011357924684")).toBeNull();
		});

		test("when the municipality code does not start with an IBGE UF code, even with a matching check digit", () => {
			expect(getNfseKeyInfo("99503082258716523000119000000000001226011357924680")).toBeNull();
			expect(getNfseKeyInfo("00503082258716523000119000000000001226011357924680")).toBeNull();
		});

		test("when ambGer is 0 or 3, even with a matching check digit", () => {
			expect(getNfseKeyInfo("35503080258716523000119000000000001226011357924689")).toBeNull();
			expect(getNfseKeyInfo("35503083258716523000119000000000001226011357924680")).toBeNull();
		});

		test("when the registration type is 0 or 3, even with a matching check digit", () => {
			expect(getNfseKeyInfo("35503082058716523000119000000000001226011357924687")).toBeNull();
			expect(getNfseKeyInfo("35503082358716523000119000000000001226011357924681")).toBeNull();
		});

		test("when the registration type is 0 or 3 and the registration is a well padded CPF", () => {
			expect(getNfseKeyInfo("35503082000040364478829000000000001226011357924689")).toBeNull();
			expect(getNfseKeyInfo("35503082300040364478829000000000001226011357924683")).toBeNull();
		});

		test("when the registration type says CPF and the registration is a CNPJ", () => {
			expect(getNfseKeyInfo("35503082158716523000119000000000001226011357924685")).toBeNull();
		});

		test("when the registration type says CNPJ and the registration is a padded CPF", () => {
			expect(getNfseKeyInfo("35503082200040364478829000000000001226011357924685")).toBeNull();
		});

		test("when a valid CPF is not left padded with 000", () => {
			expect(getNfseKeyInfo("35503082110040364478829000000000001226011357924689")).toBeNull();
			expect(getNfseKeyInfo("35503082101040364478829000000000001226011357924680")).toBeNull();
			expect(getNfseKeyInfo("35503082100140364478829000000000001226011357924680")).toBeNull();
		});

		test("when the check digits of the CPF or of the CNPJ do not match, even with a matching key check digit", () => {
			expect(getNfseKeyInfo("43149021100040364478820000000000105725120484407258")).toBeNull();
			expect(getNfseKeyInfo("35503082258716523000110000000000001226011357924686")).toBeNull();
		});

		test("when nNFSe is all zeros, even with a matching check digit", () => {
			expect(getNfseKeyInfo("35503082258716523000119000000000000026011357924683")).toBeNull();
		});

		test("when the month is 00 or 13, even with a matching check digit", () => {
			expect(getNfseKeyInfo("35503082258716523000119000000000001226001357924686")).toBeNull();
			expect(getNfseKeyInfo("35503082258716523000119000000000001226131357924684")).toBeNull();
		});

		test("when the CNPJ is alphanumeric, which no official document gives a check digit rule for", () => {
			expect(getNfseKeyInfo("355030822AB716523000119000000000001226011357924683")).toBeNull();
		});
	});

	describe("should return the parsed access key", () => {
		test("for a synthetic key of a CNPJ issuer generated by the Sistema Nacional NFS-e (São Paulo)", () => {
			expect(getNfseKeyInfo(KEY_SP)).toEqual({
				municipalityCode: "3550308",
				stateCode: "SP",
				generatorEnvironment: 2,
				taxIdType: "cnpj",
				taxId: "58716523000119",
				number: 12,
				year: 2026,
				month: 1,
				code: "135792468",
				checkDigit: 3,
			});
		});

		test("for a synthetic key of a CPF issuer generated by the municipality (Porto Alegre), dropping the 000 padding", () => {
			expect(getNfseKeyInfo(KEY_RS)).toEqual({
				municipalityCode: "4314902",
				stateCode: "RS",
				generatorEnvironment: 1,
				taxIdType: "cpf",
				taxId: "40364478829",
				number: 1057,
				year: 2025,
				month: 12,
				code: "048440725",
				checkDigit: 5,
			});
		});

		test("accepting the NFS prefix of the XML Id attribute, in any case, and surrounding whitespace", () => {
			expect(getNfseKeyInfo(`NFS${KEY_SP}`)?.number).toBe(12);
			expect(getNfseKeyInfo(`nfs${KEY_SP}`)?.number).toBe(12);
			expect(getNfseKeyInfo(`  NFS${KEY_SP}\n`)?.number).toBe(12);
			expect(getNfseKeyInfo(` ${KEY_SP} `)?.number).toBe(12);
		});

		test("for ambGer 1 on the São Paulo key, with the check digit recalculated", () => {
			expect(
				getNfseKeyInfo("35503081258716523000119000000000001226011357924686")?.generatorEnvironment,
			).toBe(1);
		});

		test("for month 12, the upper boundary", () => {
			expect(getNfseKeyInfo("35503082258716523000119000000000001226121357924687")?.month).toBe(12);
		});

		test("for the largest nNFSe, which a JavaScript number still holds exactly", () => {
			expect(getNfseKeyInfo("35503082258716523000119999999999999926011357924686")?.number).toBe(
				9_999_999_999_999,
			);
		});

		test("for years 00 and 99 of the two digit year", () => {
			expect(getNfseKeyInfo("35503082258716523000119000000000001200011357924681")?.year).toBe(2000);
			expect(getNfseKeyInfo("35503082258716523000119000000000001299011357924681")?.year).toBe(2099);
		});

		test("keeping the leading zeros of a numeric code of all zeros", () => {
			expect(getNfseKeyInfo("35503082258716523000119000000000001226010000000004")?.code).toBe(
				"000000000",
			);
		});

		test("for check digit 0 out of remainders 0 and 1, and check digit 1 out of remainder 10", () => {
			expect(getNfseKeyInfo("35503082258716523000119000000000001226011234567890")?.checkDigit).toBe(
				0,
			);
			expect(getNfseKeyInfo("35503082258716523000119000000000001226011234567840")?.checkDigit).toBe(
				0,
			);
			expect(getNfseKeyInfo("35503082258716523000119000000000001226011234567831")?.checkDigit).toBe(
				1,
			);
		});
	});

	describe("properties", () => {
		const parts = fc.tuple(
			fc.constantFrom(...Object.keys(IBGE_UF_CODES)),
			fc.stringMatching(/^[0-9]{5}$/),
			fc.constantFrom(1, 2),
			fc.constantFrom(...ISSUERS),
			fc.integer({ min: 1, max: 9_999_999_999_999 }),
			fc.stringMatching(/^[0-9]{2}$/),
			fc.integer({ min: 1, max: 12 }),
			fc.stringMatching(/^[0-9]{9}$/),
		);

		test("should give back every field of a well-formed access key", () => {
			fc.assert(
				fc.property(parts, (fields) => {
					const [uf, municipality, ambGer, issuer, number, year, month, code] = fields;
					const head = `${uf}${municipality}${ambGer}${issuer.type}${issuer.registration}`;
					const issue = `${year}${String(month).padStart(2, "0")}`;
					const body = `${head}${String(number).padStart(13, "0")}${issue}${code}`;
					const checkDigit = expectedCheckDigit(body);
					const parsed = getNfseKeyInfo(`${body}${checkDigit}`);

					expect(parsed?.municipalityCode).toBe(`${uf}${municipality}`);
					expect(parsed?.stateCode).toBe(IBGE_UF_CODES[uf]);
					expect(parsed?.generatorEnvironment).toBe(ambGer);
					expect(parsed?.taxIdType).toBe(issuer.taxIdType);
					expect(parsed?.taxId).toBe(issuer.taxId);
					expect(parsed?.number).toBe(number);
					expect(parsed?.year).toBe(2000 + Number(year));
					expect(parsed?.month).toBe(month);
					expect(parsed?.code).toBe(code);
					expect(parsed?.checkDigit).toBe(checkDigit);
				}),
			);
		});

		test("should accept exactly one check digit for a well-formed body", () => {
			fc.assert(
				fc.property(fc.stringMatching(/^[0-9]{9}$/), (code) => {
					const base = `${KEY_SP.slice(0, 40)}${code}`;
					const accepted = CHECK_DIGITS.filter((digit) => getNfseKeyInfo(`${base}${digit}`));

					expect(accepted).toHaveLength(1);
				}),
			);
		});

		test("should return null exactly when isValidNfseKey rejects a well-formed key with one digit changed", () => {
			fc.assert(
				fc.property(
					parts,
					fc.integer({ min: 0, max: 49 }),
					fc.constantFrom(...CHECK_DIGITS),
					fc.constantFrom("", "NFS", "nfs", " "),
					(
						[uf, municipality, ambGer, issuer, number, year, month, code],
						position,
						digit,
						prefix,
					) => {
						const body = [
							uf,
							municipality,
							ambGer,
							issuer.type,
							issuer.registration,
							String(number).padStart(13, "0"),
							year,
							String(month).padStart(2, "0"),
							code,
						].join("");
						const key = `${body}${expectedCheckDigit(body)}`;
						const changed = `${prefix}${key.slice(0, position)}${digit}${key.slice(position + 1)}`;
						expect(getNfseKeyInfo(changed) === null).toBe(!isValidNfseKey(changed));
					},
				),
			);
		});

		const textOrAnything = fc.oneof(anyText, fc.anything());

		test("should return null exactly when isValidNfseKey rejects any text or any value", () => {
			fc.assert(
				fc.property(textOrAnything, (value) => {
					expect(getNfseKeyInfo(value as string) === null).toBe(!isValidNfseKey(value as string));
				}),
			);
		});

		test("should never throw and always return an access key or null", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					const parsed = getNfseKeyInfo(value as string);

					expect(parsed === null || typeof parsed.taxId === "string").toBe(true);
				}),
			);
		});
	});
});

describe("getNfseKeyInfo types", () => {
	test("should take a string and return an NfseKeyInfo or null", () => {
		expectTypeOf(getNfseKeyInfo).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(getNfseKeyInfo).returns.toEqualTypeOf<NfseKeyInfo | null>();
		expectTypeOf<NfseKeyInfo>().toEqualTypeOf<{
			municipalityCode: string;
			stateCode: StateCode;
			generatorEnvironment: NfseKeyGeneratorEnvironment;
			taxIdType: NfseKeyTaxIdType;
			taxId: string;
			number: number;
			year: number;
			month: number;
			code: string;
			checkDigit: number;
		}>();
		expectTypeOf<NfseKeyGeneratorEnvironment>().toEqualTypeOf<1 | 2>();
		expectTypeOf<NfseKeyGeneratorEnvironment>().toEqualTypeOf<
			(typeof GENERATOR_ENVIRONMENTS)[number]
		>();
		expectTypeOf<NfseKeyTaxIdType>().toEqualTypeOf<"cpf" | "cnpj">();
	});
});
