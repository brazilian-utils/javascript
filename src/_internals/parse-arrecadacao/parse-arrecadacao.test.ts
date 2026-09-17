import { describe, expect, test } from "../test/runtime";
import { parseArrecadacao } from "./parse-arrecadacao";

const FEBRABAN_BARCODE = "84610000000246100291100054603390069589506108";
const FEBRABAN_LINE = "846100000005246100291102005460339004695895061080";

const MOD11_BARCODE = "85890000460524601791606075930508683148300001";
const MOD11_LINE = "858900004609524601791605607593050865831483000010";

describe("parseArrecadacao", () => {
	describe("should return null", () => {
		test("when it does not start with 8", () => {
			expect(parseArrecadacao("10491443385511900000200000000141325230000093423")).toBeNull();
		});

		test("when the length is neither 44 nor 48", () => {
			expect(parseArrecadacao("8")).toBeNull();
			expect(parseArrecadacao(FEBRABAN_BARCODE.slice(0, 43))).toBeNull();
			expect(parseArrecadacao(`${FEBRABAN_LINE}0`)).toBeNull();
		});

		test("when the segment is 0 or 8, which the FEBRABAN layout does not define (DV geral recomputed for each)", () => {
			expect(parseArrecadacao("80650000000246100291100054603390069589506108")).toBeNull();
			expect(parseArrecadacao("88670000000246100291100054603390069589506108")).toBeNull();
		});

		test("when the value identifier is not 6, 7, 8 or 9", () => {
			expect(parseArrecadacao(`845${FEBRABAN_BARCODE.slice(3)}`)).toBeNull();
		});

		test("when the general check digit is wrong", () => {
			const broken = `${FEBRABAN_BARCODE.slice(0, 3)}9${FEBRABAN_BARCODE.slice(4)}`;
			expect(parseArrecadacao(broken)).toBeNull();
		});

		test("when a block check digit is wrong", () => {
			const broken = `${FEBRABAN_LINE.slice(0, 11)}9${FEBRABAN_LINE.slice(12)}`;
			expect(parseArrecadacao(broken)).toBeNull();
		});

		test("when it does not start with 8, even at a valid barcode length with a checksum that would otherwise match (segment '4', identifier '6', mod10 general check digit recomputed by hand for this fixture)", () => {
			expect(parseArrecadacao("14610000000000000000000000000000000000000000")).toBeNull();
		});

		test("when the length is neither 44 nor 48, even starting with 8 with a checksum that would otherwise match (segment '4', identifier '6', mod10 general check digit recomputed by hand for this 46 digit fixture)", () => {
			expect(parseArrecadacao("8466000000000000000000000000000000000000000000")).toBeNull();
		});

		test("when the identifier is not 6, 7, 8 or 9, even with a checksum that would otherwise match modulo 11 (segment '4', identifier '0', mod11 'arrecadacao' general check digit recomputed by hand for this fixture)", () => {
			expect(parseArrecadacao("84010000000246100291100054603390069589506108")).toBeNull();
		});
	});

	describe("should parse a modulo 10 bank slip (FEBRABAN 'Layout Padrão de Arrecadação' §11 example, position 3 = '6')", () => {
		test("from the barcode", () => {
			expect(parseArrecadacao(FEBRABAN_BARCODE)).toStrictEqual({
				barcode: FEBRABAN_BARCODE,
				segment: 4,
				hasEffectiveValue: true,
				amount: 2461,
			});
		});

		test("from the linha digitável", () => {
			expect(parseArrecadacao(FEBRABAN_LINE)?.barcode).toBe(FEBRABAN_BARCODE);
		});
	});

	describe("should parse a modulo 11 bank slip (mcrvaz/boleto-brasileiro-validator fixture, position 3 = '8')", () => {
		test("from the barcode", () => {
			expect(parseArrecadacao(MOD11_BARCODE)).toStrictEqual({
				barcode: MOD11_BARCODE,
				segment: 5,
				hasEffectiveValue: true,
				amount: 4_605_246,
			});
		});

		test("from the linha digitável", () => {
			expect(parseArrecadacao(MOD11_LINE)?.barcode).toBe(MOD11_BARCODE);
		});
	});

	describe("should flag reference values", () => {
		test("when the identifier is 7 (modulo 10), reusing the FEBRABAN example barcode with position 3 changed to '7' and the DV geral recalculated with the same modulo 10", () => {
			expect(parseArrecadacao("84790000000246100291100054603390069589506108")).toStrictEqual({
				barcode: "84790000000246100291100054603390069589506108",
				segment: 4,
				hasEffectiveValue: false,
				amount: 2461,
			});
		});

		test("when the identifier is 9 (modulo 11)", () => {
			expect(
				parseArrecadacao("859700004603524601791605607593050865831483000010")?.hasEffectiveValue,
			).toBe(false);
		});
	});
});
