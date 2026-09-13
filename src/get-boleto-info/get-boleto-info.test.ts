import * as fc from "fast-check";

import { describe, expect, expectTypeOf, test } from "../_internals/test/runtime";
import { generateBoleto } from "../generate-boleto/generate-boleto";
import { isValidBoleto } from "../is-valid-boleto/is-valid-boleto";
import { type BoletoInfo, type GetBoletoInfoOptions, getBoletoInfo } from "./get-boleto-info";

const withFactor = {
	"0000": "00190000090114971860168524522114100000000102656",
	"0999": "00190000090114971860168524522114209990000102656",
	"1000": "00190000090114971860168524522114210000000102656",
	"1001": "00190000090114971860168524522114810010000102656",
	"5000": "00190000090114971860168524522114350000000102656",
	"7000": "00190000090114971860168524522114970000000102656",
	"7586": "00190000090114971860168524522114675860000102656",
	"7654": "00190000090114971860168524522114576540000102656",
	"8841": "00190000090114971860168524522114488410000102656",
	"8999": "00190000090114971860168524522114489990000102656",
	"9999": "00190000090114971860168524522114799990000102656",
};

const REFERENCE_DATE = new Date(2025, 5, 15);

const CANONICAL_INFO = {
	amount: 102_656,
	expirationDate: new Date(2018, 6, 15),
	bankCode: "001",
};

const ARRECADACAO_LINE = "846100000005246100291102005460339004695895061080";
const ARRECADACAO_BARCODE = "84610000000246100291100054603390069589506108";

describe("getBoletoInfo", () => {
	describe("should return undefined", () => {
		test("when boleto is empty string", () => {
			expect(getBoletoInfo("")).toBeUndefined();
		});

		test("when boleto is invalid", () => {
			expect(getBoletoInfo("00190000090114971860168524522114775860000102656")).toBeUndefined();
		});
	});

	describe("should return boleto info", () => {
		test("when boleto is valid without mask", () => {
			const info = getBoletoInfo(withFactor["7586"], { referenceDate: REFERENCE_DATE });

			expect(info).toStrictEqual(CANONICAL_INFO);
		});

		test("when boleto is valid with mask", () => {
			const masked = "0019000009 01149.718601 68524.522114 6 75860000102656";

			expect(getBoletoInfo(masked, { referenceDate: REFERENCE_DATE })).toStrictEqual(
				CANONICAL_INFO,
			);
		});

		test("when the amount field is all zeros (same fixture as the 'valid without mask' boleto, amount positions 37-46 zeroed and the main check digit recalculated)", () => {
			expect(getBoletoInfo("00190000090114971860168524522114675860000000000")?.amount).toBe(0);
		});
	});

	describe("fator de vencimento (fixtures share a banco 001, R$ 1.026,56 slip with only the factor and check digits changed; FEBRABAN restarted the factor at 1000 on 22/02/2025 right after it reached 9999 on 21/02/2025, so the same factor can map to two dates 9000 days apart, and referenceDate pins which cycle wins)", () => {
		const referenceDate = REFERENCE_DATE;

		test("should return null when there is no fator de vencimento", () => {
			expect(getBoletoInfo(withFactor["0000"], { referenceDate })?.expirationDate).toBeNull();
		});

		test("should return null when the fator starts with zero", () => {
			expect(getBoletoInfo(withFactor["0999"], { referenceDate })?.expirationDate).toBeNull();
		});

		test("should resolve the fator 1000 to 22/02/2025 (new cycle)", () => {
			expect(getBoletoInfo(withFactor["1000"], { referenceDate })?.expirationDate).toStrictEqual(
				new Date(2025, 1, 22),
			);
		});

		test("should resolve the fator 1001 to 23/02/2025 (new cycle)", () => {
			expect(getBoletoInfo(withFactor["1001"], { referenceDate })?.expirationDate).toStrictEqual(
				new Date(2025, 1, 23),
			);
		});

		test("should resolve the fator 9999 to 21/02/2025 (old cycle)", () => {
			expect(getBoletoInfo(withFactor["9999"], { referenceDate })?.expirationDate).toStrictEqual(
				new Date(2025, 1, 21),
			);
		});

		test("should resolve a mid cycle fator", () => {
			expect(getBoletoInfo(withFactor["7586"], { referenceDate })?.expirationDate).toStrictEqual(
				new Date(2018, 6, 15),
			);
			expect(getBoletoInfo(withFactor["7654"], { referenceDate })?.expirationDate).toStrictEqual(
				new Date(2018, 8, 21),
			);
			expect(getBoletoInfo(withFactor["8999"], { referenceDate })?.expirationDate).toStrictEqual(
				new Date(2022, 4, 28),
			);
			expect(getBoletoInfo(withFactor["5000"], { referenceDate })?.expirationDate).toStrictEqual(
				new Date(2036, 1, 5),
			);
		});

		test("should follow the reference date across the cycles (before the restart, factor 1000 could only mean the old cycle)", () => {
			expect(
				getBoletoInfo(withFactor["1000"], { referenceDate: new Date(2000, 6, 1) })?.expirationDate,
			).toStrictEqual(new Date(2000, 6, 3));
		});

		test("should resolve a factor inside the safety range to its closest candidate (fixture '7586' with the factor changed to 6614 and the main check digit recalculated: with referenceDate 15/06/2025 neither cycle candidate falls inside the accepted control range, landing in the safety window RANGE_BEFORE/RANGE_AFTER define, which is a heuristic of this library rather than a published FEBRABAN rule, so the closest one is used anyway)", () => {
			expect(
				getBoletoInfo("00190000090114971860168524522114466140000102656", {
					referenceDate,
				})?.expirationDate,
			).toStrictEqual(new Date(2015, 10, 16));
		});

		test("should prefer the candidate inside the control range over the closest one (factor 1000 with referenceDate 16/06/2011: the old cycle date 03/07/2000 is 4000 days back, past RANGE_BEFORE, while the new cycle date 22/02/2025 is 5000 days ahead, inside RANGE_AFTER)", () => {
			expect(
				getBoletoInfo(withFactor["1000"], { referenceDate: new Date(2011, 5, 16) })?.expirationDate,
			).toStrictEqual(new Date(2025, 1, 22));
		});

		test("should accept a factor whose difference from the reference date is exactly RANGE_AFTER (5500 days)", () => {
			expect(
				getBoletoInfo(withFactor["1000"], { referenceDate: new Date(1985, 5, 12) })?.expirationDate,
			).toStrictEqual(new Date(2000, 6, 3));
		});

		test("should never resolve a factor to a date before the 07/10/1997 base date, even when the reference date predates the scheme: the cycle search is clamped to the first cycle, so each factor below gives the single date it is able to denote", () => {
			const preSchemeReference = new Date(2000, 0, 1);

			expect(
				getBoletoInfo(withFactor["7000"], { referenceDate: preSchemeReference })?.expirationDate,
			).toStrictEqual(new Date(2016, 11, 6));
			expect(
				getBoletoInfo(withFactor["8841"], { referenceDate: preSchemeReference })?.expirationDate,
			).toStrictEqual(new Date(2021, 11, 21));
			expect(
				getBoletoInfo(withFactor["9999"], { referenceDate: preSchemeReference })?.expirationDate,
			).toStrictEqual(new Date(2025, 1, 21));
		});

		test("should keep the clamped answer stable while the reference date is still before the first cycle", () => {
			expect(
				getBoletoInfo(withFactor["8841"], { referenceDate: new Date(2003, 0, 1) })?.expirationDate,
			).toStrictEqual(new Date(2021, 11, 21));
		});

		test("should default the reference date to now", () => {
			const now = new Date();

			for (const factor of ["1000", "1001", "9999", "5000"] as const) {
				expect(getBoletoInfo(withFactor[factor])?.expirationDate).toStrictEqual(
					getBoletoInfo(withFactor[factor], { referenceDate: now })?.expirationDate,
				);
			}

			expect(getBoletoInfo(withFactor["0000"])?.expirationDate).toBeNull();
		});
	});

	describe("arrecadação (FEBRABAN Layout Padrão de Arrecadação §11 Formulário Padrão fixture: R$ 24,61, segment 4)", () => {
		test("should parse the linha digitável", () => {
			expect(getBoletoInfo(ARRECADACAO_LINE)).toStrictEqual({
				amount: 2461,
				expirationDate: null,
				bankCode: "",
				type: "arrecadacao",
				segment: 4,
				value: 24.61,
				hasEffectiveValue: true,
			});
		});

		test("should parse the código de barras", () => {
			expect(getBoletoInfo(ARRECADACAO_BARCODE)?.value).toBe(24.61);
		});

		test("should parse a formatted linha digitável", () => {
			expect(
				getBoletoInfo("84610000000-5 24610029110-2 00546033900-4 69589506108-0")?.segment,
			).toBe(4);
		});

		test("should flag a reference value", () => {
			expect(
				getBoletoInfo("847900000005246100291102005460339004695895061080")?.hasEffectiveValue,
			).toBe(false);
		});
	});

	describe("properties", () => {
		test("should read the bank code and the amount of a generated bank slip", () => {
			fc.assert(
				fc.property(fc.date({ noInvalidDate: true }), (referenceDate) => {
					const value = generateBoleto();
					const info = getBoletoInfo(value, { referenceDate });

					expect(info?.bankCode).toBe(value.slice(0, 3));
					expect(info?.amount).toBe(Number(value.slice(37, 47)));
					expect(info?.type).toBeUndefined();
				}),
			);
		});

		test("should describe a generated arrecadação bank slip", () => {
			fc.assert(
				fc.property(fc.constant("arrecadacao" as const), (type) => {
					const info = getBoletoInfo(generateBoleto({ type }));

					expect(info?.type).toBe("arrecadacao");
					expect(info?.bankCode).toBe("");
					expect(info?.expirationDate).toBeNull();
					expect(info?.value).toBe((info?.amount ?? 0) / 100);
				}),
			);
		});

		test("should return a value exactly when the bank slip is valid", () => {
			fc.assert(
				fc.property(fc.string(), (value) => {
					expect(getBoletoInfo(value) !== undefined).toBe(isValidBoleto(value));
				}),
			);
		});

		test("should never throw and always return an object or undefined", () => {
			fc.assert(
				fc.property(fc.anything(), (value) => {
					const info = getBoletoInfo(value as string);

					expect(info === undefined || typeof info === "object").toBe(true);
				}),
			);
		});
	});
});

describe("getBoletoInfo types", () => {
	test("should take a string, optional options, and return boleto info or undefined", () => {
		expectTypeOf(getBoletoInfo).parameter(0).toEqualTypeOf<string>();
		expectTypeOf(getBoletoInfo).parameter(1).toEqualTypeOf<GetBoletoInfoOptions | undefined>();
		expectTypeOf(getBoletoInfo).returns.toEqualTypeOf<BoletoInfo | undefined>();
	});

	test("should restrict referenceDate to a Date", () => {
		expectTypeOf<GetBoletoInfoOptions["referenceDate"]>().toEqualTypeOf<Date | undefined>();
	});

	test("should restrict the boleto info shape", () => {
		expectTypeOf<BoletoInfo>().toEqualTypeOf<{
			amount: number;
			expirationDate: Date | null;
			bankCode: string;
			type?: "arrecadacao";
			segment?: number;
			value?: number;
			hasEffectiveValue?: boolean;
		}>();
	});
});
