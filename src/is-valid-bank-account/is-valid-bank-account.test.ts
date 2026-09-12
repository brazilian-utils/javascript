import { BANKS } from "../_internals/constants/banks";
import { describe, expect, test } from "../_internals/test/runtime";
import { COMPE_CODES } from "./constants";
import { isValidBankAccount } from "./is-valid-bank-account";

const BANCO_DO_BRASIL_AGENCY_TOO_LONG_PARAMS = {
	bankCode: "001",
	agency: "123456",
	account: "12345678",
	digit: "5",
};

describe("isValidBankAccount", () => {
	describe("should return false", () => {
		test("when params is null", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidBankAccount(null)).toBe(false);
		});

		test("when params is undefined", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidBankAccount()).toBe(false);
		});

		test("when params is not an object", () => {
			// @ts-expect-error: intentionally invalid input
			expect(isValidBankAccount("001")).toBe(false);
		});

		test("when bankCode is an empty string", () => {
			expect(
				isValidBankAccount({
					bankCode: "",
					agency: "1234",
					account: "12345678",
					digit: "5",
				}),
			).toBe(false);
		});

		test("when agency is an empty string", () => {
			expect(
				isValidBankAccount({
					bankCode: "001",
					agency: "",
					account: "12345678",
					digit: "5",
				}),
			).toBe(false);
		});

		test("when account is an empty string", () => {
			expect(
				isValidBankAccount({
					bankCode: "001",
					agency: "1234",
					account: "",
					digit: "5",
				}),
			).toBe(false);
		});

		test("when digit is an empty string", () => {
			expect(
				isValidBankAccount({
					bankCode: "001",
					agency: "1234",
					account: "12345678",
					digit: "",
				}),
			).toBe(false);
		});

		test("when bankCode is null", () => {
			expect(
				isValidBankAccount({
					// @ts-expect-error: intentionally invalid input
					bankCode: null,
					agency: "1234",
					account: "12345678",
					digit: "5",
				}),
			).toBe(false);
		});

		test("when bankCode is undefined", () => {
			expect(
				isValidBankAccount({
					// @ts-expect-error: intentionally invalid input
					bankCode: undefined,
					agency: "1234",
					account: "12345678",
					digit: "5",
				}),
			).toBe(false);
		});

		test("when bankCode is not a string", () => {
			expect(
				isValidBankAccount({
					// @ts-expect-error: intentionally invalid input
					bankCode: 123,
					agency: "1234",
					account: "12345678",
					digit: "5",
				}),
			).toBe(false);
		});

		test("when bankCode length is not 3", () => {
			expect(
				isValidBankAccount({
					bankCode: "12",
					agency: "1234",
					account: "12345678",
					digit: "5",
				}),
			).toBe(false);

			expect(
				isValidBankAccount({
					bankCode: "1234",
					agency: "1234",
					account: "12345678",
					digit: "5",
				}),
			).toBe(false);
		});

		test("when agency length is less than 1", () => {
			expect(
				isValidBankAccount({
					bankCode: "001",
					agency: "",
					account: "12345678",
					digit: "5",
				}),
			).toBe(false);
		});

		test("when agency length is greater than 5", () => {
			expect(isValidBankAccount(BANCO_DO_BRASIL_AGENCY_TOO_LONG_PARAMS)).toBe(false);
		});

		test("when account length is less than 1", () => {
			expect(
				isValidBankAccount({
					bankCode: "001",
					agency: "1234",
					account: "",
					digit: "5",
				}),
			).toBe(false);
		});

		test("when account length is greater than 13", () => {
			expect(
				isValidBankAccount({
					bankCode: "001",
					agency: "1234",
					account: "12345678901234",
					digit: "5",
				}),
			).toBe(false);
		});

		test("when digit length is less than 1", () => {
			expect(
				isValidBankAccount({
					bankCode: "001",
					agency: "1234",
					account: "12345678",
					digit: "",
				}),
			).toBe(false);
		});

		test("when digit length is greater than 2", () => {
			expect(
				isValidBankAccount({
					bankCode: "001",
					agency: "1234",
					account: "12345678",
					digit: "123",
				}),
			).toBe(false);
		});

		test("when contains non-digit characters", () => {
			expect(
				isValidBankAccount({
					bankCode: "00a",
					agency: "1234",
					account: "12345678",
					digit: "5",
				}),
			).toBe(false);

			expect(
				isValidBankAccount({
					bankCode: "001",
					agency: "12a4",
					account: "12345678",
					digit: "5",
				}),
			).toBe(false);
		});

		test("when all characters are non-digit (empty after sanitization)", () => {
			expect(
				isValidBankAccount({
					bankCode: "abc",
					agency: "def",
					account: "ghi",
					digit: "j",
				}),
			).toBe(false);

			expect(
				isValidBankAccount({
					bankCode: "001",
					agency: "abc",
					account: "12345678",
					digit: "5",
				}),
			).toBe(false);

			expect(
				isValidBankAccount({
					bankCode: "001",
					agency: "1234",
					account: "abc",
					digit: "5",
				}),
			).toBe(false);
		});

		describe("Banco do Brasil (001)", () => {
			test("when agency length is less than 4", () => {
				expect(
					isValidBankAccount({
						bankCode: "001",
						agency: "123",
						account: "12345678",
						digit: "5",
					}),
				).toBe(false);
			});

			test("when agency length is greater than 5", () => {
				expect(isValidBankAccount(BANCO_DO_BRASIL_AGENCY_TOO_LONG_PARAMS)).toBe(false);
			});

			test("when account length is less than 8", () => {
				expect(
					isValidBankAccount({
						bankCode: "001",
						agency: "1234",
						account: "1234567",
						digit: "5",
					}),
				).toBe(false);
			});

			test("when account length is greater than 10", () => {
				expect(
					isValidBankAccount({
						bankCode: "001",
						agency: "1234",
						account: "12345678901",
						digit: "5",
					}),
				).toBe(false);
			});

			test("when digit length is not 1", () => {
				expect(
					isValidBankAccount({
						bankCode: "001",
						agency: "1234",
						account: "12345678",
						digit: "12",
					}),
				).toBe(false);
			});
		});

		describe("Itaú (341)", () => {
			test("when agency length is not 4", () => {
				expect(
					isValidBankAccount({
						bankCode: "341",
						agency: "123",
						account: "12345",
						digit: "6",
					}),
				).toBe(false);
			});

			test("when account length is not 5", () => {
				expect(
					isValidBankAccount({
						bankCode: "341",
						agency: "1234",
						account: "1234",
						digit: "6",
					}),
				).toBe(false);
			});

			test("when digit length is not 1", () => {
				expect(
					isValidBankAccount({
						bankCode: "341",
						agency: "1234",
						account: "12345",
						digit: "12",
					}),
				).toBe(false);
			});
		});

		describe("Bradesco (237)", () => {
			test("when agency length is not 4", () => {
				expect(
					isValidBankAccount({
						bankCode: "237",
						agency: "123",
						account: "1234567",
						digit: "5",
					}),
				).toBe(false);
			});

			test("when account length is not 7", () => {
				expect(
					isValidBankAccount({
						bankCode: "237",
						agency: "1234",
						account: "123456",
						digit: "5",
					}),
				).toBe(false);
			});

			test("when digit length is not 1", () => {
				expect(
					isValidBankAccount({
						bankCode: "237",
						agency: "1234",
						account: "1234567",
						digit: "12",
					}),
				).toBe(false);
			});
		});

		describe("Santander (033)", () => {
			test("when agency length is not 4", () => {
				expect(
					isValidBankAccount({
						bankCode: "033",
						agency: "123",
						account: "12345678",
						digit: "5",
					}),
				).toBe(false);
			});

			test("when account length is not 8", () => {
				expect(
					isValidBankAccount({
						bankCode: "033",
						agency: "1234",
						account: "1234567",
						digit: "5",
					}),
				).toBe(false);
			});

			test("when digit length is not 1", () => {
				expect(
					isValidBankAccount({
						bankCode: "033",
						agency: "1234",
						account: "12345678",
						digit: "12",
					}),
				).toBe(false);
			});
		});

		describe("Caixa (104)", () => {
			test("when agency length is not 4", () => {
				expect(
					isValidBankAccount({
						bankCode: "104",
						agency: "123",
						account: "00123456789",
						digit: "0",
					}),
				).toBe(false);
			});

			test("when account length is not 11", () => {
				expect(
					isValidBankAccount({
						bankCode: "104",
						agency: "1234",
						account: "1234567890",
						digit: "0",
					}),
				).toBe(false);
			});

			test("when digit length is not 1", () => {
				expect(
					isValidBankAccount({
						bankCode: "104",
						agency: "1234",
						account: "00123456789",
						digit: "12",
					}),
				).toBe(false);
			});
		});
	});

	describe("should return true", () => {
		describe("for valid inputs with generic validation", () => {
			test('when the digit matches mod10 (mod10("123456") = 6)', () => {
				expect(
					isValidBankAccount({
						bankCode: "246",
						agency: "1234",
						account: "123456",
						digit: "6",
					}),
				).toBe(true);
			});
			test('when the digit matches mod11 (mod11("123456") = 1)', () => {
				expect(
					isValidBankAccount({
						bankCode: "246",
						agency: "1234",
						account: "123456",
						digit: "1",
					}),
				).toBe(true);
			});
		});

		describe("when inputs contain formatting characters", () => {
			test("should sanitize and validate", () => {
				expect(
					isValidBankAccount({
						bankCode: "246",
						agency: "123-4",
						account: "123.456-78",
						digit: "2",
					}),
				).toBe(true);
			});
		});

		describe("Banco do Brasil (001)", () => {
			test("when account 00210169 has the correct check digit 6 (sum 60, remainder 5, 11 - 5 = 6)", () => {
				expect(
					isValidBankAccount({
						bankCode: "001",
						agency: "1584",
						account: "00210169",
						digit: "6",
					}),
				).toBe(true);
			});

			test("when account 00020394 has the correct check digit 7 (sum 59, remainder 4, 11 - 4 = 7)", () => {
				expect(
					isValidBankAccount({
						bankCode: "001",
						agency: "5892",
						account: "00020394",
						digit: "7",
					}),
				).toBe(true);
			});

			test("when the check digit is X for account 00189062 (sum 122, remainder 1, 11 - 1 = 10 -> X) and false when the digit is 0", () => {
				expect(
					isValidBankAccount({
						bankCode: "001",
						agency: "7138",
						account: "00189062",
						digit: "X",
					}),
				).toBe(true);

				expect(
					isValidBankAccount({
						bankCode: "001",
						agency: "7138",
						account: "00189062",
						digit: "0",
					}),
				).toBe(false);
			});

			test("when the check digit is 0 for account 10089939 (sum 165, remainder 0), unlike the boleto variant which maps remainder 0 to 1", () => {
				expect(
					isValidBankAccount({
						bankCode: "001",
						agency: "1234",
						account: "10089939",
						digit: "0",
					}),
				).toBe(true);

				expect(
					isValidBankAccount({
						bankCode: "001",
						agency: "1234",
						account: "10089939",
						digit: "1",
					}),
				).toBe(false);
			});
		});

		describe("Itaú (341)", () => {
			test("when the account check digit is correct (agency 2545 + account 02366, mod10 sum 39, remainder 9, 10 - 9 = 1)", () => {
				expect(
					isValidBankAccount({
						bankCode: "341",
						agency: "2545",
						account: "02366",
						digit: "1",
					}),
				).toBe(true);
			});

			test("when the check digit is 0 for agency 1874 + account 10009 (sum 30, remainder 0)", () => {
				expect(
					isValidBankAccount({
						bankCode: "341",
						agency: "1874",
						account: "10009",
						digit: "0",
					}),
				).toBe(true);
			});
		});

		describe("Bradesco (237)", () => {
			test("when account 0238069 has the correct check digit 2 (mod11 sum 108, remainder 9, 11 - 9 = 2)", () => {
				expect(
					isValidBankAccount({
						bankCode: "237",
						agency: "1234",
						account: "0238069",
						digit: "2",
					}),
				).toBe(true);
			});

			test("when account 0284025 has the correct check digit 1 (sum 98, remainder 10, 11 - 10 = 1)", () => {
				expect(
					isValidBankAccount({
						bankCode: "237",
						agency: "1234",
						account: "0284025",
						digit: "1",
					}),
				).toBe(true);
			});

			test("when the check digit is 0 for account 0325620 (sum 88, remainder 0)", () => {
				expect(
					isValidBankAccount({
						bankCode: "237",
						agency: "1234",
						account: "0325620",
						digit: "0",
					}),
				).toBe(true);
			});

			test("when the check digit is P for account 0301357 (sum 67, remainder 1), also accepted rendered as 0, and false when the digit is 1", () => {
				expect(
					isValidBankAccount({
						bankCode: "237",
						agency: "1234",
						account: "0301357",
						digit: "P",
					}),
				).toBe(true);

				expect(
					isValidBankAccount({
						bankCode: "237",
						agency: "1234",
						account: "0301357",
						digit: "0",
					}),
				).toBe(true);

				expect(
					isValidBankAccount({
						bankCode: "237",
						agency: "1234",
						account: "0301357",
						digit: "1",
					}),
				).toBe(false);
			});
		});

		describe("Santander (033)", () => {
			test("when the account check digit is correct (agency 0189 + account 01017417, weighted sum with tens discarded is 51, remainder 1, 10 - 1 = 9)", () => {
				expect(
					isValidBankAccount({
						bankCode: "033",
						agency: "0189",
						account: "01017417",
						digit: "9",
					}),
				).toBe(true);
			});

			test("when agency 3414 + account 01092006 has the correct check digit 4 (sum 46, remainder 6, 10 - 6 = 4)", () => {
				expect(
					isValidBankAccount({
						bankCode: "033",
						agency: "3414",
						account: "01092006",
						digit: "4",
					}),
				).toBe(true);
			});
		});

		describe("Caixa (104)", () => {
			test("when the account check digit is correct (agency 0647 + account 00188888888, weighted sum 455, x10 = 4550, remainder 7)", () => {
				expect(
					isValidBankAccount({
						bankCode: "104",
						agency: "0647",
						account: "00188888888",
						digit: "7",
					}),
				).toBe(true);
			});

			test("when agency 2004 + account 00100000448 has the correct check digit 6 (sum 82, x10 = 820, remainder 6)", () => {
				expect(
					isValidBankAccount({
						bankCode: "104",
						agency: "2004",
						account: "00100000448",
						digit: "6",
					}),
				).toBe(true);
			});

			test("when the calculated digit is the exceptional 10 for account 00000000006 (bank variant mod11 remainder 1), rendered as 0", () => {
				expect(
					isValidBankAccount({
						bankCode: "104",
						agency: "0000",
						account: "00000000006",
						digit: "0",
					}),
				).toBe(true);
			});
		});

		describe("generic validation with a two digit check", () => {
			test('when the digit matches mod10 followed by mod11 (mod10("123456") = 6, mod11 over "1234566" sum 121, remainder 0) and false for a wrong second digit', () => {
				expect(
					isValidBankAccount({
						bankCode: "246",
						agency: "1234",
						account: "123456",
						digit: "60",
					}),
				).toBe(true);

				expect(
					isValidBankAccount({
						bankCode: "246",
						agency: "1234",
						account: "123456",
						digit: "66",
					}),
				).toBe(false);
			});

			test('when the second digit is the exceptional 10 (mod10("000016") = 6, bank variant mod11 over "0000166" has remainder 1), rendered as 0', () => {
				expect(
					isValidBankAccount({
						bankCode: "246",
						agency: "1234",
						account: "000016",
						digit: "60",
					}),
				).toBe(true);
			});

			test('when only the bank variant of mod11 matches (mod10 and the boleto variant of mod11 both give 1 for "000014", but the bank variant gives 0)', () => {
				expect(
					isValidBankAccount({
						bankCode: "246",
						agency: "1234",
						account: "000014",
						digit: "0",
					}),
				).toBe(true);
			});
		});
	});

	describe("bank code registry", () => {
		test("should return false when the bank code is not in the Banco Central STR participants list", () => {
			expect(
				isValidBankAccount({
					bankCode: "999",
					agency: "1234",
					account: "123456",
					digit: "6",
				}),
			).toBe(false);
		});

		test("should return false for another unassigned bank code that would otherwise pass the generic check", () => {
			expect(
				isValidBankAccount({
					bankCode: "998",
					agency: "1234",
					account: "123456",
					digit: "1",
				}),
			).toBe(false);
		});

		test("should return true for a listed bank that has no published algorithm, using the generic check", () => {
			expect(
				isValidBankAccount({
					bankCode: "246",
					agency: "1234",
					account: "123456",
					digit: "6",
				}),
			).toBe(true);
		});
	});

	describe("Banrisul (041)", () => {
		test("should return true for agency 2664 and account 35.850767.0-6 (banktools-br banrisul/account_spec.rb)", () => {
			expect(
				isValidBankAccount({
					bankCode: "041",
					agency: "2664",
					account: "358507670",
					digit: "6",
				}),
			).toBe(true);
		});

		test("should return true for agency 1234 and account 358507671-8 (daniel-dia/br-bank-account-validator banrisul_validator.spec.ts)", () => {
			expect(
				isValidBankAccount({
					bankCode: "041",
					agency: "1234",
					account: "358507671",
					digit: "8",
				}),
			).toBe(true);
		});

		test("should return false for account 35.850767.0-3 (banktools-br banrisul/account_spec.rb invalid digit)", () => {
			expect(
				isValidBankAccount({
					bankCode: "041",
					agency: "2664",
					account: "358507670",
					digit: "3",
				}),
			).toBe(false);
		});

		test("should return false for account 358507671-0 (daniel-dia/br-bank-account-validator banrisul_validator.spec.ts invalid digit)", () => {
			expect(
				isValidBankAccount({
					bankCode: "041",
					agency: "1234",
					account: "358507671",
					digit: "0",
				}),
			).toBe(false);
		});

		test("should return true when the weighted sum is a multiple of 11, where the digit is 0", () => {
			expect(
				isValidBankAccount({
					bankCode: "041",
					agency: "1234",
					account: "100000004",
					digit: "0",
				}),
			).toBe(true);
		});

		test("should return false when the account does not have 9 digits", () => {
			expect(
				isValidBankAccount({
					bankCode: "041",
					agency: "1234",
					account: "35850767",
					digit: "6",
				}),
			).toBe(false);
		});

		test("should return false when the agency does not have 4 digits", () => {
			expect(
				isValidBankAccount({
					bankCode: "041",
					agency: "266",
					account: "358507670",
					digit: "6",
				}),
			).toBe(false);
		});

		test("should return false when the digit has 2 characters", () => {
			expect(
				isValidBankAccount({
					bankCode: "041",
					agency: "2664",
					account: "358507670",
					digit: "60",
				}),
			).toBe(false);
		});
	});

	describe("HSBC / Kirton Bank (399)", () => {
		test("should return true for agency 0007 and account 853838-6 (Icatu compendium example, also banktools-br hsbc/account_spec.rb)", () => {
			expect(
				isValidBankAccount({
					bankCode: "399",
					agency: "0007",
					account: "853838",
					digit: "6",
				}),
			).toBe(true);
		});

		test("should return true for agency 1996 and account 498991-4 (banktools-br hsbc/account_spec.rb)", () => {
			expect(
				isValidBankAccount({
					bankCode: "399",
					agency: "1996",
					account: "498991",
					digit: "4",
				}),
			).toBe(true);
		});

		test("should return true for agency 1913 and account 104012-0 (banktools-br hsbc/account_spec.rb)", () => {
			expect(
				isValidBankAccount({
					bankCode: "399",
					agency: "1913",
					account: "104012",
					digit: "0",
				}),
			).toBe(true);
		});

		test("should return false for agency 0007 and account 853838-7 (banktools-br hsbc/account_spec.rb invalid digit)", () => {
			expect(
				isValidBankAccount({
					bankCode: "399",
					agency: "0007",
					account: "853838",
					digit: "7",
				}),
			).toBe(false);
		});

		test("should return false for agency 1996 and account 498991-5 (banktools-br hsbc/account_spec.rb invalid digit)", () => {
			expect(
				isValidBankAccount({
					bankCode: "399",
					agency: "1996",
					account: "498991",
					digit: "5",
				}),
			).toBe(false);
		});

		test("should return true when the remainder is 10, where the digit is 0", () => {
			expect(
				isValidBankAccount({
					bankCode: "399",
					agency: "0000",
					account: "000006",
					digit: "0",
				}),
			).toBe(true);
		});

		test("should return false when the account does not have 6 digits", () => {
			expect(
				isValidBankAccount({
					bankCode: "399",
					agency: "0007",
					account: "85383",
					digit: "6",
				}),
			).toBe(false);
		});
	});

	describe("Citibank (745)", () => {
		test("should return true for agency 0075 and account 0007500465-8 (Icatu compendium example, also banktools-br citybank/account_spec.rb)", () => {
			expect(
				isValidBankAccount({
					bankCode: "745",
					agency: "0075",
					account: "0007500465",
					digit: "8",
				}),
			).toBe(true);
		});

		test("should return true for agency 0001 and account 2000967610-4 (banktools-br citybank/account_spec.rb)", () => {
			expect(
				isValidBankAccount({
					bankCode: "745",
					agency: "0001",
					account: "2000967610",
					digit: "4",
				}),
			).toBe(true);
		});

		test("should return true for agency 0062 and account 2574827866-9 (banktools-br citybank/account_spec.rb)", () => {
			expect(
				isValidBankAccount({
					bankCode: "745",
					agency: "0062",
					account: "2574827866",
					digit: "9",
				}),
			).toBe(true);
		});

		test("should return false for agency 0075 and account 0007500465-2 (banktools-br citybank/account_spec.rb invalid digit)", () => {
			expect(
				isValidBankAccount({
					bankCode: "745",
					agency: "0075",
					account: "0007500465",
					digit: "2",
				}),
			).toBe(false);
		});

		test("should return false for agency 0001 and account 2000967610-1 (banktools-br citybank/account_spec.rb invalid digit)", () => {
			expect(
				isValidBankAccount({
					bankCode: "745",
					agency: "0001",
					account: "2000967610",
					digit: "1",
				}),
			).toBe(false);
		});

		test("should return true when the remainder is 0 or 1, where the digit is 0 in both cases", () => {
			expect(
				isValidBankAccount({
					bankCode: "745",
					agency: "0075",
					account: "1000000000",
					digit: "0",
				}),
			).toBe(true);

			expect(
				isValidBankAccount({
					bankCode: "745",
					agency: "0075",
					account: "1000000006",
					digit: "0",
				}),
			).toBe(true);
		});

		test("should return false when the account does not have 10 digits", () => {
			expect(
				isValidBankAccount({
					bankCode: "745",
					agency: "0075",
					account: "007500465",
					digit: "8",
				}),
			).toBe(false);
		});
	});

	describe("Nubank (260)", () => {
		test("should return true for agency 0001 and account 5216125-0 (Xerpa/bran_checker nubank_test.exs)", () => {
			expect(
				isValidBankAccount({
					bankCode: "260",
					agency: "0001",
					account: "5216125",
					digit: "0",
				}),
			).toBe(true);
		});

		test("should return true for agency 0001 and account 1699629-9 (Xerpa/bran_checker nubank_test.exs)", () => {
			expect(
				isValidBankAccount({
					bankCode: "260",
					agency: "0001",
					account: "1699629",
					digit: "9",
				}),
			).toBe(true);
		});

		test("should return true for the 8 digit account 96805203-6 (Xerpa/bran_checker nubank_test.exs)", () => {
			expect(
				isValidBankAccount({
					bankCode: "260",
					agency: "0001",
					account: "96805203",
					digit: "6",
				}),
			).toBe(true);
		});

		test("should return true for the zero padded account 00076832060-9, where the leading zeros are dropped (Xerpa/bran_checker nubank_test.exs)", () => {
			expect(
				isValidBankAccount({
					bankCode: "260",
					agency: "0001",
					account: "00076832060",
					digit: "9",
				}),
			).toBe(true);
		});

		test("should return false for account 5216125-1 (Xerpa/bran_checker nubank_test.exs invalid digit)", () => {
			expect(
				isValidBankAccount({
					bankCode: "260",
					agency: "0001",
					account: "5216125",
					digit: "1",
				}),
			).toBe(false);
		});

		test("should return false for account 1699629-0 (Xerpa/bran_checker nubank_test.exs invalid digit)", () => {
			expect(
				isValidBankAccount({
					bankCode: "260",
					agency: "0001",
					account: "96805203",
					digit: "3",
				}),
			).toBe(false);
		});

		test("should return false when the agency does not have 4 digits", () => {
			expect(
				isValidBankAccount({
					bankCode: "260",
					agency: "001",
					account: "5216125",
					digit: "0",
				}),
			).toBe(false);
		});

		test("should return false when the account has less than 5 digits", () => {
			expect(
				isValidBankAccount({
					bankCode: "260",
					agency: "0001",
					account: "5216",
					digit: "0",
				}),
			).toBe(false);
		});
	});

	describe("banks validated by structure only", () => {
		test("should return true for a Banco Inter (077) account that matches the documented format", () => {
			expect(
				isValidBankAccount({
					bankCode: "077",
					agency: "0001",
					account: "123456789",
					digit: "0",
				}),
			).toBe(true);
		});

		test("should return true for a C6 (336) account, which publishes no check digit rule", () => {
			expect(
				isValidBankAccount({
					bankCode: "336",
					agency: "0001",
					account: "1792706",
					digit: "4",
				}),
			).toBe(true);
		});

		test("should return true for a Sicoob (756) account with any check digit", () => {
			expect(
				isValidBankAccount({
					bankCode: "756",
					agency: "3005",
					account: "1234567",
					digit: "9",
				}),
			).toBe(true);
		});

		test("should return false when the check digit is not numeric", () => {
			expect(
				isValidBankAccount({
					bankCode: "077",
					agency: "0001",
					account: "123456789",
					digit: "X",
				}),
			).toBe(false);
		});

		test("should return false when the check digit has 2 characters", () => {
			expect(
				isValidBankAccount({
					bankCode: "077",
					agency: "0001",
					account: "123456789",
					digit: "01",
				}),
			).toBe(false);
		});
	});

	describe("reference vectors of the already supported banks", () => {
		test("should return true for Banco do Brasil agency 5725 and account 01055025-9 (banktools-br bb/account_spec.rb)", () => {
			expect(
				isValidBankAccount({
					bankCode: "001",
					agency: "5725",
					account: "01055025",
					digit: "9",
				}),
			).toBe(true);
		});

		test("should return false for Banco do Brasil agency 0647 and account 01226990-7 (banktools-br bb/account_spec.rb invalid digit)", () => {
			expect(
				isValidBankAccount({
					bankCode: "001",
					agency: "0647",
					account: "01226990",
					digit: "7",
				}),
			).toBe(false);
		});

		test("should return true for Bradesco agency 3295 and account 0284.025-1 (banktools-br bradesco/account_spec.rb)", () => {
			expect(
				isValidBankAccount({
					bankCode: "237",
					agency: "3295",
					account: "0284025",
					digit: "1",
				}),
			).toBe(true);
		});

		test("should return false for Bradesco agency 1425 and account 0238.069-3 (banktools-br bradesco/account_spec.rb invalid digit)", () => {
			expect(
				isValidBankAccount({
					bankCode: "237",
					agency: "1425",
					account: "0238069",
					digit: "3",
				}),
			).toBe(false);
		});

		test("should return true for Caixa agency 1278 and account 00118939153-0 (banktools-br caixa_economica/account_spec.rb)", () => {
			expect(
				isValidBankAccount({
					bankCode: "104",
					agency: "1278",
					account: "00118939153",
					digit: "0",
				}),
			).toBe(true);
		});

		test("should return false for Caixa agency 2933 and account 00197787120-2 (banktools-br caixa_economica/account_spec.rb invalid digit)", () => {
			expect(
				isValidBankAccount({
					bankCode: "104",
					agency: "2933",
					account: "00197787120",
					digit: "2",
				}),
			).toBe(false);
		});

		test("should return true for Itau agency 4313 and account 43129-0 (Xerpa/bran_checker itau_test.exs)", () => {
			expect(
				isValidBankAccount({
					bankCode: "341",
					agency: "4313",
					account: "43129",
					digit: "0",
				}),
			).toBe(true);
		});

		test("should return false for Itau agency 4313 and account 43129-9 (Xerpa/bran_checker itau_test.exs invalid digit)", () => {
			expect(
				isValidBankAccount({
					bankCode: "341",
					agency: "4313",
					account: "43129",
					digit: "9",
				}),
			).toBe(false);
		});

		test("should return true for Santander agency 0092 and account 46535495-0 (Xerpa/bran_checker santander_test.exs)", () => {
			expect(
				isValidBankAccount({
					bankCode: "033",
					agency: "0092",
					account: "46535495",
					digit: "0",
				}),
			).toBe(true);
		});

		test("should return false for Santander agency 0060 and account 01098486-1 (Xerpa/bran_checker santander_test.exs invalid digit)", () => {
			expect(
				isValidBankAccount({
					bankCode: "033",
					agency: "0060",
					account: "01098486",
					digit: "1",
				}),
			).toBe(false);
		});
	});

	describe("type coercion and structural edge cases", () => {
		test("should return false when bankCode is a truthy number that stringifies to a listed code", () => {
			expect(
				isValidBankAccount({
					// @ts-expect-error: intentionally invalid input
					bankCode: 246,
					agency: "1234",
					account: "123456",
					digit: "6",
				}),
			).toBe(false);
		});

		test("should return false when agency is a truthy number matching a real agency", () => {
			expect(
				isValidBankAccount({
					bankCode: "246",
					// @ts-expect-error: intentionally invalid input
					agency: 1234,
					account: "123456",
					digit: "6",
				}),
			).toBe(false);
		});

		test("should return false when account is a truthy number matching a real account", () => {
			expect(
				isValidBankAccount({
					bankCode: "246",
					agency: "1234",
					// @ts-expect-error: intentionally invalid input
					account: 123_456,
					digit: "6",
				}),
			).toBe(false);
		});

		test("should return false when digit is a truthy number", () => {
			expect(
				isValidBankAccount({
					bankCode: "246",
					agency: "1234",
					account: "123456",
					// @ts-expect-error: intentionally invalid input
					digit: 6,
				}),
			).toBe(false);
		});

		test("should return false when params is a function carrying otherwise valid fields as own properties", () => {
			const params = Object.assign(() => null, {
				bankCode: "001",
				agency: "1584",
				account: "00210169",
				digit: "6",
			});

			expect(isValidBankAccount(params)).toBe(false);
		});

		test("should return false when the bank code has 2 digits, even one that prefixes a listed code", () => {
			expect(
				isValidBankAccount({
					bankCode: "24",
					agency: "1234",
					account: "123456",
					digit: "6",
				}),
			).toBe(false);
		});

		test("should return false when the agency sanitizes to 0 digits for a bank with no agency-specific rule", () => {
			expect(
				isValidBankAccount({
					bankCode: "246",
					agency: "abc",
					account: "123456",
					digit: "6",
				}),
			).toBe(false);
		});

		test("should return false when the account sanitizes to 0 digits, even though mod10('') would match the digit", () => {
			expect(
				isValidBankAccount({
					bankCode: "246",
					agency: "1234",
					account: "xyz",
					digit: "0",
				}),
			).toBe(false);
		});

		test("should return false when the account has 14 digits, even with its real mod10 check digit (mod10 of the 14 digit account is 7)", () => {
			expect(
				isValidBankAccount({
					bankCode: "246",
					agency: "1234",
					account: "12345678901234",
					digit: "7",
				}),
			).toBe(false);
		});

		test("should return false when the Bradesco agency is longer than its 4 digit rule, even though bradescoDigits ignores the agency", () => {
			expect(
				isValidBankAccount({
					bankCode: "237",
					agency: "12345",
					account: "0238069",
					digit: "2",
				}),
			).toBe(false);
		});

		test("should return false when the Bradesco account is longer than its 7 digit rule, even with its own real check digit (mod11 bank variant, maxWeight 7, over '02380695' is 9)", () => {
			expect(
				isValidBankAccount({
					bankCode: "237",
					agency: "1234",
					account: "02380695",
					digit: "9",
				}),
			).toBe(false);
		});

		test("should return false when the agency has 6 digits for a bank with no agency-specific rule, even with the correct account check digit", () => {
			expect(
				isValidBankAccount({
					bankCode: "246",
					agency: "123456",
					account: "123456",
					digit: "6",
				}),
			).toBe(false);
		});

		test("should return true when the agency has exactly 5 digits for a bank with no agency-specific rule", () => {
			expect(
				isValidBankAccount({
					bankCode: "246",
					agency: "12345",
					account: "123456",
					digit: "6",
				}),
			).toBe(true);
		});

		test("should return true when the account has exactly 13 digits for a bank with no account-specific rule (mod10 of the 13 digit account is 7)", () => {
			expect(
				isValidBankAccount({
					bankCode: "246",
					agency: "1234",
					account: "1234567890123",
					digit: "7",
				}),
			).toBe(true);
		});

		test("should return false when the check digit has 3 characters that sanitize down to 1, even for a structure-only bank", () => {
			expect(
				isValidBankAccount({
					bankCode: "077",
					agency: "0001",
					account: "123456789",
					digit: "px1",
				}),
			).toBe(false);
		});

		test("should return false when a structure-only account is longer than 13 digits", () => {
			expect(
				isValidBankAccount({
					bankCode: "077",
					agency: "0001",
					account: "123456789012345",
					digit: "0",
				}),
			).toBe(false);
		});

		test("should return false when a structure-only digit has 2 characters that sanitize down to 1", () => {
			expect(
				isValidBankAccount({
					bankCode: "077",
					agency: "0001",
					account: "123456789",
					digit: "P5",
				}),
			).toBe(false);
		});

		test("should sanitize a hyphen out of the Banco do Brasil check digit (-6 sanitizes to 6, the correct digit)", () => {
			expect(
				isValidBankAccount({
					bankCode: "001",
					agency: "1584",
					account: "00210169",
					digit: "-6",
				}),
			).toBe(true);
		});

		test("should return false for generic validation when the digit matches neither mod10 nor either mod11 variant (123456 gives 6, 1 and 0)", () => {
			expect(
				isValidBankAccount({
					bankCode: "246",
					agency: "1234",
					account: "123456",
					digit: "9",
				}),
			).toBe(false);
		});

		test("should return true for the two digit generic check when the second digit is a plain digit, not 0 or 10 (mod10('123457') = 4, mod11 bank variant over '1234574' = 1)", () => {
			expect(
				isValidBankAccount({
					bankCode: "246",
					agency: "1234",
					account: "123457",
					digit: "41",
				}),
			).toBe(true);
		});

		test("should accept the last bank code of COMPE_CODES, which an endsWith based scan would never reach", () => {
			expect(COMPE_CODES.endsWith("757")).toBe(true);
			expect(BANKS.some((bank) => bank.code === "757")).toBe(true);

			expect(
				isValidBankAccount({
					bankCode: "757",
					agency: "1234",
					account: "123456",
					digit: "6",
				}),
			).toBe(true);
		});
	});

	describe("COMPE_CODES", () => {
		test("should hold every code of the Banco Central STR participants list, in the same order", () => {
			expect(COMPE_CODES).toBe(BANKS.map((bank) => bank.code).join(""));
		});

		test("should reject 030, which only appears as a misaligned substring of the concatenated codes", () => {
			expect(COMPE_CODES.includes("030")).toBe(true);
			expect(BANKS.some((bank) => bank.code === "030")).toBe(false);

			expect(
				isValidBankAccount({
					bankCode: "030",
					agency: "1234",
					account: "123456",
					digit: "6",
				}),
			).toBe(false);
		});

		test("should accept 003, which is a listed code at an aligned position", () => {
			expect(
				isValidBankAccount({
					bankCode: "003",
					agency: "1234",
					account: "123456",
					digit: "6",
				}),
			).toBe(true);
		});
	});
});
