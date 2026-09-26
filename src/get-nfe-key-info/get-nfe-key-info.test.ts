import * as fc from "fast-check";

import { IBGE_UF_CODES } from "../_internals/constants/ibge-uf-codes";
import { type StateCode } from "../_internals/constants/states";
import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import {
	EMISSION_TYPES_BY_MODEL,
	FORBIDDEN_CODES,
	VALID_MODELS,
} from "../is-valid-nfe-key/constants";
import { isValidNfeKey } from "../is-valid-nfe-key/is-valid-nfe-key";
import { getNfeKeyInfo, type NfeKeyInfo, type NfeKeyModel } from "./get-nfe-key-info";

const KEY_SP = "35170458716523000119550010000000121000123458";
const KEY_RS = "43160472202112000136550000000010571048440722";
const KEY_CPF_PADDED = "35170400040364478829550010000000121000123457";

const CHECK_DIGITS = Array.from({ length: 10 }, (_, digit) => String(digit));

const AUTHORIZATION_SITE_MODELS = new Set(["62", "66"]);

const MODEL_EMISSION_TYPES: { model: string; emissionType: number }[] = VALID_MODELS.flatMap(
	(model) => EMISSION_TYPES_BY_MODEL[model].map((emissionType) => ({ model, emissionType })),
);

const buildNfeKey = (base: string): string =>
	CHECK_DIGITS.map((digit) => `${base}${digit}`).find((key) => getNfeKeyInfo(key) !== null) ?? "";

describe("getNfeKeyInfo", () => {
	describe("should return null", () => {
		test("when it is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getNfeKeyInfo(null)).toBeNull();
		});

		test("when it is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getNfeKeyInfo()).toBeNull();
		});

		test("when it is a number", () => {
			// @ts-expect-error: intentionally invalid input
			expect(getNfeKeyInfo(123)).toBeNull();
		});

		test("when it is an empty string", () => {
			expect(getNfeKeyInfo("")).toBeNull();
		});

		test("when the check digit does not match", () => {
			expect(getNfeKeyInfo(`${KEY_SP.slice(0, 43)}9`)).toBeNull();
		});

		test("when the model is not one of the nine supported (model 99 with a matching check digit)", () => {
			expect(getNfeKeyInfo("35170458716523000119990010000000121000123453")).toBeNull();
		});

		test("when the document number is zero", () => {
			expect(getNfeKeyInfo("35170458716523000119550010000000001000123457")).toBeNull();
		});

		test("when tpEmis is 8, which the NF-e MOC does not assign, even with a matching check digit", () => {
			expect(getNfeKeyInfo("35170458716523000119550010000000128000123455")).toBeNull();
		});

		test("when tpEmis belongs to another model: 2 for a CT-e, 3 for a CT-e OS, 9 for an MDF-e, 3 for a BP-e", () => {
			expect(getNfeKeyInfo("35170458716523000119570010000000122000123453")).toBeNull();
			expect(getNfeKeyInfo("35170458716523000119670010000000123000123454")).toBeNull();
			expect(getNfeKeyInfo("35170458716523000119580010000000129000123454")).toBeNull();
			expect(getNfeKeyInfo("35170458716523000119630010000000123000123450")).toBeNull();
		});

		test("when the cNF of an NF-e is one rule B03-10 of the MOC forbids", () => {
			expect(getNfeKeyInfo("35170458716523000119550010000000121000000003")).toBeNull();
			expect(getNfeKeyInfo("35170458716523000119550010000000121111111113")).toBeNull();
			expect(getNfeKeyInfo("35170458716523000119550010000000121123456781")).toBeNull();
		});

		test("when the cNF of an NF-e equals its nNF, the second half of rule B03-10", () => {
			expect(getNfeKeyInfo("35170458716523000119550010000123451000123458")).toBeNull();
		});

		test("when the access key is otherwise invalid", () => {
			expect(getNfeKeyInfo("not-a-key")).toBeNull();
		});
	});

	describe("should return the parsed access key", () => {
		test("for a NF-e access key (SP), the NFePHP `Keys::build` doc example also used in is-valid-nfe-key.test.ts", () => {
			expect(getNfeKeyInfo(KEY_SP)).toEqual({
				stateCode: "SP",
				year: 2017,
				month: 4,
				taxId: "58716523000119",
				model: "55",
				series: 1,
				number: 12,
				emissionType: 1,
				code: "00012345",
				checkDigit: 8,
			});
		});

		test("for a NF-e access key (RS), the NFePHP sped-cte `$infNFe->chave` example (NF-e referenced by a CT-e)", () => {
			expect(getNfeKeyInfo(KEY_RS)).toEqual({
				stateCode: "RS",
				year: 2016,
				month: 4,
				taxId: "72202112000136",
				model: "55",
				series: 0,
				number: 1057,
				emissionType: 1,
				code: "04844072",
				checkDigit: 2,
			});
		});

		test("accepting the NFe XML prefix and a whitespace mask", () => {
			expect(getNfeKeyInfo(`NFe${KEY_SP}`)?.taxId).toBe("58716523000119");
			expect(getNfeKeyInfo("3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458")?.number).toBe(
				12,
			);
		});

		test("accepting the XML Id prefix of every other covered document", () => {
			expect(getNfeKeyInfo("CTe35170458716523000119570010000000121000123455")?.model).toBe("57");
			expect(getNfeKeyInfo("MDFe35170458716523000119580010000000121000123459")?.model).toBe("58");
			expect(getNfeKeyInfo("BPe35170458716523000119630010000000121000123453")?.model).toBe("63");
			expect(getNfeKeyInfo("NF3e35170458716523000119660010000000121000123454")?.model).toBe("66");
			expect(getNfeKeyInfo("NFCom35170458716523000119620010000000121000123450")?.model).toBe("62");
		});

		test("for the CT-e models the SVC-SP authorises, whose MOC assigns tpEmis 8", () => {
			expect(getNfeKeyInfo("35170458716523000119570010000000128000123452")?.emissionType).toBe(8);
			expect(getNfeKeyInfo("35170458716523000119670010000000128000123455")?.emissionType).toBe(8);
			expect(getNfeKeyInfo("35170458716523000119640010000000128000123454")?.emissionType).toBe(8);
		});

		test("for the MDF-e contingência Regime Especial NFF, tpEmis 3", () => {
			expect(getNfeKeyInfo("35170458716523000119580010000000123000123455")?.emissionType).toBe(3);
		});

		test("keeping the cNF of a CT-e that rule B03-10 would forbid, since only the NF-e MOC states it", () => {
			expect(getNfeKeyInfo("35170458716523000119570010000000121000000000")?.code).toBe("00000000");
			expect(getNfeKeyInfo("35170458716523000119570010000123451000123455")?.code).toBe("00012345");
		});

		test("keeping the left zero padding of a CPF issuer, using a synthetic key with an 11-digit CPF left-padded to 14 digits in the tax id field and the check digit recalculated", () => {
			expect(getNfeKeyInfo(KEY_CPF_PADDED)?.taxId).toBe("00040364478829");
			expect(getNfeKeyInfo(KEY_CPF_PADDED)?.taxId).toHaveLength(14);
		});

		test("for tpEmis 9, the off-line NFC-e contingency, same shape as the SP key with the tpEmis field changed and the check digit recalculated", () => {
			expect(getNfeKeyInfo("35170458716523000119550010000000129000123453")?.emissionType).toBe(9);
		});

		test("for every other DF-e model (CT-e, MDF-e, GTV-e, NFC-e, CT-e OS), same shape as the SP key with the model field changed and the check digit recalculated", () => {
			expect(getNfeKeyInfo("35170458716523000119570010000000121000123455")?.model).toBe("57");
			expect(getNfeKeyInfo("35170458716523000119580010000000121000123459")?.model).toBe("58");
			expect(getNfeKeyInfo("35170458716523000119630010000000121000123453")?.model).toBe("63");
			expect(getNfeKeyInfo("35170458716523000119640010000000121000123457")?.model).toBe("64");
			expect(getNfeKeyInfo("35170458716523000119650010000000121000123450")?.model).toBe("65");
			expect(getNfeKeyInfo("35170458716523000119670010000000121000123458")?.model).toBe("67");
		});

		test("splitting nSiteAutoriz from the 7 digit cNF of an NFCom, per its Visão Geral §2.1.3", () => {
			expect(getNfeKeyInfo("35170458716523000119620010000000121000123450")).toEqual({
				stateCode: "SP",
				year: 2017,
				month: 4,
				taxId: "58716523000119",
				model: "62",
				series: 1,
				number: 12,
				emissionType: 1,
				authorizationSite: 0,
				code: "0012345",
				checkDigit: 0,
			});
			expect(getNfeKeyInfo("35170458716523000119620010000000121700123452")?.authorizationSite).toBe(
				7,
			);
		});

		test("splitting nSiteAutoriz from the 7 digit cNF of an NF3e, per its Visão Geral", () => {
			expect(getNfeKeyInfo("35170458716523000119660010000000121000123454")).toEqual({
				stateCode: "SP",
				year: 2017,
				month: 4,
				taxId: "58716523000119",
				model: "66",
				series: 1,
				number: 12,
				emissionType: 1,
				authorizationSite: 0,
				code: "0012345",
				checkDigit: 4,
			});
		});

		test("without an authorizationSite property for a model whose key has no nSiteAutoriz", () => {
			expect(getNfeKeyInfo(KEY_SP)).not.toHaveProperty("authorizationSite");
		});
	});

	describe("properties", () => {
		const parts = fc.tuple(
			fc.constantFrom(...Object.keys(IBGE_UF_CODES)),
			fc.stringMatching(/^[0-9]{2}$/),
			fc.integer({ min: 1, max: 12 }),
			fc.stringMatching(/^[0-9]{14}$/),
			fc.constantFrom(...MODEL_EMISSION_TYPES),
			fc.stringMatching(/^[0-9]{3}$/),
			fc.integer({ min: 1, max: 999_999_999 }),
			fc.stringMatching(/^[0-9]{8}$/),
		);

		test("should give back every field of a well-formed access key", () => {
			fc.assert(
				fc.property(parts, (fields) => {
					const [uf, year, month, taxId, document, series, number, tail] = fields;
					const { model, emissionType } = document;
					const hasSite = AUTHORIZATION_SITE_MODELS.has(model);
					const code = hasSite ? tail.slice(1) : tail;

					fc.pre(!FORBIDDEN_CODES.includes(code) && Number(code) !== number);

					const issuer = `${uf}${year}${String(month).padStart(2, "0")}${taxId}`;
					const numbering = `${model}${series}${String(number).padStart(9, "0")}`;
					const key = buildNfeKey(`${issuer}${numbering}${emissionType}${tail}`);
					const parsed = getNfeKeyInfo(key);

					expect(parsed?.stateCode).toBe(IBGE_UF_CODES[uf]);
					expect(parsed?.year).toBe(2000 + Number(year));
					expect(parsed?.month).toBe(month);
					expect(parsed?.taxId).toBe(taxId);
					expect(parsed?.model).toBe(model);
					expect(parsed?.series).toBe(Number(series));
					expect(parsed?.number).toBe(number);
					expect(parsed?.emissionType).toBe(emissionType);
					expect(parsed?.authorizationSite).toBe(hasSite ? Number(tail.charAt(0)) : undefined);
					expect(parsed?.code).toBe(code);
					expect(parsed?.checkDigit).toBe(Number(key.charAt(43)));
				}),
			);
		});

		test("should return null exactly when isValidNfeKey returns false", () => {
			const key = parts.map(([uf, year, month, taxId, document, series, number, tail]) =>
				buildNfeKey(
					`${uf}${year}${String(month).padStart(2, "0")}${taxId}${document.model}${series}${String(number).padStart(9, "0")}${document.emissionType}${tail}`,
				),
			);

			const input = fc.oneof(key, fc.string(), fc.anything());

			fc.assert(
				fc.property(input, (value) => {
					expect(getNfeKeyInfo(value as string) === null).toBe(!isValidNfeKey(value as string));
				}),
			);
		});

		test("should never throw and always return an access key or null", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					const parsed = getNfeKeyInfo(value as string);

					expect(parsed === null || typeof parsed.taxId === "string").toBe(true);
				}),
			);
		});
	});
});

describe("getNfeKeyInfo types", () => {
	test("should take a string and return an NfeKeyInfo or null", () => {
		expectTypeOf(getNfeKeyInfo).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(getNfeKeyInfo).returns.toEqualTypeOf<NfeKeyInfo | null>();
		expectTypeOf<NfeKeyInfo>().toEqualTypeOf<{
			stateCode: StateCode;
			year: number;
			month: number;
			taxId: string;
			model: NfeKeyModel;
			series: number;
			number: number;
			emissionType: number;
			authorizationSite?: number;
			code: string;
			checkDigit: number;
		}>();
		expectTypeOf<NfeKeyModel>().toEqualTypeOf<
			"55" | "57" | "58" | "62" | "63" | "64" | "65" | "66" | "67"
		>();
		expectTypeOf<NfeKeyModel>().toEqualTypeOf<(typeof VALID_MODELS)[number]>();
	});
});
