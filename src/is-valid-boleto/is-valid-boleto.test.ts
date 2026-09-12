import { BOLETO_LENGTH } from "../_internals/constants/boleto";
import { describe, expect, test } from "../_internals/test/runtime";
import { isValidBoleto } from "./is-valid-boleto";

describe("isValidBoleto", () => {
	describe("should return false", () => {
		test("when it is an empty string", () => {
			expect(isValidBoleto("")).toBe(false);
		});

		test("when it is null", () => {
			// @ts-expect-error
			expect(isValidBoleto(null)).toBe(false);
		});

		test("when it is undefined", () => {
			// @ts-expect-error
			expect(isValidBoleto(undefined)).toBe(false);
		});

		test(`when length is less than ${BOLETO_LENGTH}`, () => {
			expect(isValidBoleto("123456789")).toBe(false);
		});

		test("when is array", () => {
			// @ts-expect-error
			expect(isValidBoleto([])).toBe(false);
		});

		test("when is object", () => {
			// @ts-expect-error
			expect(isValidBoleto({})).toBe(false);
		});

		test("when is boolean", () => {
			// @ts-expect-error
			expect(isValidBoleto(true)).toBe(false);
			// @ts-expect-error
			expect(isValidBoleto(false)).toBe(false);
		});

		test("when check digit mod10 is invalid", () => {
			expect(isValidBoleto("00190000020114971860168524522114675860000102656")).toBe(false);
		});

		test("check digit mod11 is invalid", () => {
			expect(isValidBoleto("00190000090114971860168524522114975860000102656")).toBe(false);
		});

		test(`when length is greater than ${BOLETO_LENGTH}, even with extra digits appended to an otherwise valid boleto`, () => {
			expect(isValidBoleto("00190000090114971860168524522114675860000102656999")).toBe(false);
		});
	});

	describe("should return true", () => {
		test("when is a boleto valid without mask", () => {
			expect(isValidBoleto("00190000090114971860168524522114675860000102656")).toBe(true);
		});

		test("when is a boleto valid with mask", () => {
			expect(isValidBoleto("0019000009 01149.718601 68524.522114 6 75860000102656")).toBe(true);
		});
	});

	describe("arrecadação", () => {
		const FEBRABAN_LINE = "846100000005246100291102005460339004695895061080";
		const FEBRABAN_BARCODE = "84610000000246100291100054603390069589506108";

		describe("should return true", () => {
			test("for the FEBRABAN 'Layout Padrão de Arrecadação' §11 modulo 10 linha digitável example", () => {
				expect(isValidBoleto(FEBRABAN_LINE)).toBe(true);
			});

			test("for the mcrvaz/boleto-brasileiro-validator modulus 10 linha digitável fixture", () => {
				expect(isValidBoleto("836200000005667800481000180975657313001589636081")).toBe(true);
			});

			test("for the mrmgomes/boleto-utils modulus 10 linha digitável fixture", () => {
				expect(isValidBoleto("846300000003299902962024004101360008002006441147")).toBe(true);
			});

			test("when it is a valid modulo 11 linha digitável", () => {
				expect(isValidBoleto("858900004609524601791605607593050865831483000010")).toBe(true);
				expect(isValidBoleto("848900000002404201622015806051904292586034111220")).toBe(true);
				expect(isValidBoleto("858000000070438403281922630720192528304729600523")).toBe(true);
				expect(isValidBoleto("838600000050096000190009000801782309000343062712")).toBe(true);
				expect(isValidBoleto("858200000007572503282030560708202107539591904460")).toBe(true);
			});

			test("for the barcode form of the FEBRABAN §11 modulus 10 example", () => {
				expect(isValidBoleto(FEBRABAN_BARCODE)).toBe(true);
				expect(isValidBoleto("85890000460524601791606075930508683148300001")).toBe(true);
			});

			test("when it has a mask", () => {
				expect(isValidBoleto("84610000000-5 24610029110-2 00546033900-4 69589506108-0")).toBe(true);
			});
		});

		describe("should return false", () => {
			test("when the general check digit is wrong", () => {
				expect(isValidBoleto(`8469${FEBRABAN_BARCODE.slice(4)}`)).toBe(false);
			});

			test("when a block check digit is wrong", () => {
				expect(isValidBoleto(`${FEBRABAN_LINE.slice(0, 11)}9${FEBRABAN_LINE.slice(12)}`)).toBe(
					false,
				);
			});

			test("when the value identifier is not 6, 7, 8 or 9", () => {
				expect(isValidBoleto(`841${FEBRABAN_BARCODE.slice(3)}`)).toBe(false);
			});

			test("when the length is wrong", () => {
				expect(isValidBoleto(FEBRABAN_LINE.slice(0, 47))).toBe(false);
				expect(isValidBoleto(`${FEBRABAN_LINE}0`)).toBe(false);
			});
		});
	});
});
