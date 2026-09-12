import { describe, expect, test } from "../_internals/test/runtime";
import { parseNfeKey } from "./parse-nfe-key";

const KEY_SP = "35170458716523000119550010000000121000123458";
const KEY_RS = "43160472202112000136550000000010571048440722";
const KEY_CPF_PADDED = "35170400040364478829550010000000121000123457";

describe("parseNfeKey", () => {
	describe("should return null", () => {
		test("when it is null", () => {
			// @ts-expect-error
			expect(parseNfeKey(null)).toBeNull();
		});

		test("when it is undefined", () => {
			// @ts-expect-error
			expect(parseNfeKey(undefined)).toBeNull();
		});

		test("when it is a number", () => {
			// @ts-expect-error
			expect(parseNfeKey(123)).toBeNull();
		});

		test("when it is an empty string", () => {
			expect(parseNfeKey("")).toBeNull();
		});

		test("when the check digit does not match", () => {
			expect(parseNfeKey(`${KEY_SP.slice(0, 43)}9`)).toBeNull();
		});

		test("when the model is not 55, 57, 58 or 65 (model 99 with a matching check digit)", () => {
			expect(parseNfeKey("35170458716523000119990010000000121000123453")).toBeNull();
		});

		test("when the document number is zero", () => {
			expect(parseNfeKey("35170458716523000119550010000000001000123457")).toBeNull();
		});

		test("when the access key is otherwise invalid", () => {
			expect(parseNfeKey("not-a-key")).toBeNull();
		});
	});

	describe("should return the parsed access key", () => {
		test("for a NF-e access key (SP), the NFePHP `Keys::build` doc example also used in is-valid-nfe-key.test.ts", () => {
			expect(parseNfeKey(KEY_SP)).toEqual({
				state: "SP",
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
			expect(parseNfeKey(KEY_RS)).toEqual({
				state: "RS",
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
			expect(parseNfeKey(`NFe${KEY_SP}`)?.taxId).toBe("58716523000119");
			expect(parseNfeKey("3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458")?.number).toBe(
				12,
			);
		});

		test("keeping the left zero padding of a CPF issuer, using a synthetic key with an 11-digit CPF left-padded to 14 digits in the tax id field and the check digit recalculated", () => {
			expect(parseNfeKey(KEY_CPF_PADDED)?.taxId).toBe("00040364478829");
			expect(parseNfeKey(KEY_CPF_PADDED)?.taxId).toHaveLength(14);
		});

		test("for every other DF-e model (CT-e, MDF-e, NFC-e), same shape as the SP key with the model field changed and the check digit recalculated", () => {
			expect(parseNfeKey("35170458716523000119570010000000121000123455")?.model).toBe("57");
			expect(parseNfeKey("35170458716523000119580010000000121000123459")?.model).toBe("58");
			expect(parseNfeKey("35170458716523000119650010000000121000123450")?.model).toBe("65");
		});
	});
});
