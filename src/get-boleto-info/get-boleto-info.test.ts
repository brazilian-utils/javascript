import { describe, expect, test } from "../_internals/test/runtime";
import { getBoletoInfo } from "./get-boleto-info";

const withFactor = {
	"0000": "00190000090114971860168524522114100000000102656",
	"0999": "00190000090114971860168524522114209990000102656",
	"1000": "00190000090114971860168524522114210000000102656",
	"1001": "00190000090114971860168524522114810010000102656",
	"5000": "00190000090114971860168524522114350000000102656",
	"7586": "00190000090114971860168524522114675860000102656",
	"7654": "00190000090114971860168524522114576540000102656",
	"8999": "00190000090114971860168524522114489990000102656",
	"9999": "00190000090114971860168524522114799990000102656",
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
			expect(getBoletoInfo("00190000090114971860168524522114675860000102656")).toStrictEqual({
				amount: 102656,
				expirationDate: new Date(2018, 6, 15),
				bankCode: "001",
			});
		});

		test("when boleto is valid with mask", () => {
			expect(getBoletoInfo("0019000009 01149.718601 68524.522114 6 75860000102656")).toStrictEqual({
				amount: 102656,
				expirationDate: new Date(2018, 6, 15),
				bankCode: "001",
			});
		});

		test("when the amount field is all zeros (same fixture as the 'valid without mask' boleto, amount positions 37-46 zeroed and the main check digit recalculated)", () => {
			expect(getBoletoInfo("00190000090114971860168524522114675860000000000")?.amount).toBe(0);
		});
	});

	describe("fator de vencimento (fixtures share a banco 001, R$ 1.026,56 slip with only the factor and check digits changed; FEBRABAN restarted the factor at 1000 on 22/02/2025 right after it reached 9999 on 21/02/2025, so the same factor can map to two dates 9000 days apart, and referenceDate pins which cycle wins)", () => {
		const referenceDate = new Date(2025, 5, 15);

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

		test("should resolve a factor inside the safety range to its closest candidate (fixture '7586' with the factor changed to 6614 and the main check digit recalculated: with referenceDate 15/06/2025 neither cycle candidate falls inside the accepted control range, landing in the 'range de segurança' the FEBRABAN manual describes, so the closest one is used anyway)", () => {
			expect(
				getBoletoInfo("00190000090114971860168524522114466140000102656", {
					referenceDate,
				})?.expirationDate,
			).toStrictEqual(new Date(2015, 10, 16));
		});

		test("should accept a factor whose difference from the reference date is exactly RANGE_AFTER (5500 days), even though the other cycle candidate (3500 days before the reference, on the other side) is numerically closer", () => {
			expect(
				getBoletoInfo(withFactor["1000"], { referenceDate: new Date(1985, 5, 12) })?.expirationDate,
			).toStrictEqual(new Date(2000, 6, 3));
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
});
