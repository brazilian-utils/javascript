import { generateChecksum } from "../_internals/generate-checksum/generate-checksum";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { mod10 } from "../_internals/mod10/mod10";
import { mod11 } from "../_internals/mod11/mod11";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import {
	BANRISUL_ACCOUNT_WEIGHTS,
	CITIBANK_ACCOUNT_WEIGHTS,
	COMPE_CODES,
	HSBC_AGENCY_ACCOUNT_WEIGHTS,
	SANTANDER_WEIGHTS,
	STRUCTURE_ONLY_BANK_CODES,
	VERHOEFF_INVERSE,
	VERHOEFF_MULTIPLICATION,
	VERHOEFF_PERMUTATION,
} from "./constants";

/** The bank account `isValidBankAccount` checks: the bank, the agency and the account with its check digit. */
export type IsValidBankAccountOptions = {
	/** Three digit bank code (COMPE), e.g. "001" for Banco do Brasil. */
	bankCode: string;
	/** Agency number, digits only, without its own check digit. */
	agency: string;
	/** Account number, digits only, without the check digit. */
	account: string;
	/** The account check digit, one character. */
	digit: string;
};

/**
 * The bank account `isValidBankAccount` checks: the bank, the agency and the account with its
 * check digit.
 *
 * @deprecated Use `IsValidBankAccountOptions` instead.
 */
export type IsValidBankAccountParams = IsValidBankAccountOptions;

type BankAccountDigits = (agency: string, account: string) => string[];

type BankAccountRule = {
	minAgencyLength: number;
	maxAgencyLength: number;
	minAccountLength: number;
	maxAccountLength: number;
	digits: BankAccountDigits | null;
};

const bancoDoBrasilDigits: BankAccountDigits = (_agency, account) => {
	const digit = mod11(account, { variant: "bank" });

	return [digit === 10 ? "X" : String(digit)];
};

const santanderDigits: BankAccountDigits = (agency, account) => {
	const base = `${agency}00${account}`;

	let sum = 0;
	let position = 0;

	for (const weight of SANTANDER_WEIGHTS) {
		// Stryker disable next-line ArithmeticOperator: SANTANDER_WEIGHTS sums to 60, a multiple of 10, so replacing -48 with +48 shifts every term's contribution by a multiple of 10 mod 10, leaving the final check digit unchanged for every possible input.
		sum += ((base.charCodeAt(position) - 48) * weight) % 10;
		position++;
	}

	return [String((10 - (sum % 10)) % 10)];
};

const banrisulDigits: BankAccountDigits = (_agency, account) => {
	const remainder = generateChecksum({ base: account, weight: BANRISUL_ACCOUNT_WEIGHTS }) % 11;

	if (remainder === 0) return ["0"];
	if (remainder === 1) return ["6"];

	return [String(11 - remainder)];
};

const caixaDigits: BankAccountDigits = (agency, account) => {
	const digit = mod11(agency + account, { variant: "bank" });

	return [String(digit === 10 ? 0 : digit)];
};

const bradescoDigits: BankAccountDigits = (_agency, account) => {
	const digit = mod11(account, { variant: "bank", maxWeight: 7 });

	return digit === 10 ? ["P", "0"] : [String(digit)];
};

const nubankDigits: BankAccountDigits = (_agency, account) => {
	const base = account.replace(/^0+(?=\d)/, "");

	let checksum = 0;

	for (let i = base.length - 1, position = 1; i >= 0; i--, position++) {
		const permuted = VERHOEFF_PERMUTATION[position % 8][base.charCodeAt(i) - 48];
		checksum = VERHOEFF_MULTIPLICATION[checksum][permuted];
	}

	return [String(VERHOEFF_INVERSE[checksum])];
};

const itauDigits: BankAccountDigits = (agency, account) => [String(mod10(agency + account))];

const hsbcDigits: BankAccountDigits = (agency, account) => {
	const remainder =
		generateChecksum({ base: agency + account, weight: HSBC_AGENCY_ACCOUNT_WEIGHTS }) % 11;

	return [String(remainder === 10 ? 0 : remainder)];
};

const citibankDigits: BankAccountDigits = (_agency, account) => {
	const remainder = generateChecksum({ base: account, weight: CITIBANK_ACCOUNT_WEIGHTS }) % 11;

	return [String(remainder <= 1 ? 0 : 11 - remainder)];
};

const BANK_RULES: Record<string, BankAccountRule> = {
	"001": {
		minAgencyLength: 4,
		maxAgencyLength: 5,
		minAccountLength: 8,
		maxAccountLength: 10,
		digits: bancoDoBrasilDigits,
	},
	"033": {
		minAgencyLength: 4,
		maxAgencyLength: 4,
		minAccountLength: 8,
		maxAccountLength: 8,
		digits: santanderDigits,
	},
	"041": {
		minAgencyLength: 4,
		maxAgencyLength: 4,
		minAccountLength: 9,
		maxAccountLength: 9,
		digits: banrisulDigits,
	},
	"104": {
		minAgencyLength: 4,
		maxAgencyLength: 4,
		minAccountLength: 11,
		maxAccountLength: 11,
		digits: caixaDigits,
	},
	"237": {
		minAgencyLength: 4,
		maxAgencyLength: 4,
		minAccountLength: 7,
		maxAccountLength: 7,
		digits: bradescoDigits,
	},
	"260": {
		minAgencyLength: 4,
		maxAgencyLength: 4,
		minAccountLength: 5,
		maxAccountLength: 13,
		digits: nubankDigits,
	},
	"341": {
		minAgencyLength: 4,
		maxAgencyLength: 4,
		minAccountLength: 5,
		maxAccountLength: 5,
		digits: itauDigits,
	},
	"399": {
		minAgencyLength: 4,
		maxAgencyLength: 4,
		minAccountLength: 6,
		maxAccountLength: 6,
		digits: hsbcDigits,
	},
	"745": {
		minAgencyLength: 4,
		maxAgencyLength: 4,
		minAccountLength: 10,
		maxAccountLength: 10,
		digits: citibankDigits,
	},
};

const STRUCTURE_ONLY_RULE: BankAccountRule = {
	minAgencyLength: 1,
	maxAgencyLength: 5,
	minAccountLength: 1,
	maxAccountLength: 13,
	digits: null,
};

const isListedBankCode = (bankCode: string): boolean => {
	// Stryker disable next-line EqualityOperator: bankCode always has exactly 3 characters here and COMPE_CODES.length is always a multiple of 3, so the extra out-of-range iteration only tests an empty remainder against a 3-character code, which never matches.
	for (let i = 0; i < COMPE_CODES.length; i += 3) {
		if (COMPE_CODES.startsWith(bankCode, i)) return true;
	}

	return false;
};

const findRule = (bankCode: string): BankAccountRule | null => {
	if (Object.hasOwn(BANK_RULES, bankCode)) return BANK_RULES[bankCode];

	if (STRUCTURE_ONLY_BANK_CODES.includes(bankCode)) return STRUCTURE_ONLY_RULE;

	return null;
};

const validateWithRule = (
	rule: BankAccountRule,
	agency: string,
	account: string,
	digit: string,
): boolean => {
	if (agency.length < rule.minAgencyLength || agency.length > rule.maxAgencyLength) return false;
	if (account.length < rule.minAccountLength || account.length > rule.maxAccountLength)
		return false;
	if (digit.length !== 1) return false;

	if (rule.digits === null) return sanitizeToDigits(digit).length === 1;

	return rule.digits(agency, account).includes(digit);
};

const validateGeneric = (account: string, digit: string): boolean => {
	if (digit.length === 2) {
		const first = mod10(account);
		const second = mod11(`${account}${first}`, { variant: "bank" });

		return `${first}${second === 10 ? 0 : second}` === digit;
	}

	return (
		String(mod10(account)) === digit ||
		String(mod11(account)) === digit ||
		String(mod11(account, { variant: "bank" })) === digit
	);
};

const sanitizeCheckDigit = (value: string): string =>
	value.toUpperCase().replaceAll(/[^\dPX]/g, "");

/**
 * Validates a Brazilian bank account. The bank code must belong to the Banco Central do Brasil
 * STR participants list, otherwise the account is rejected.
 *
 * Banks validated by their published check digit algorithm:
 * Banco do Brasil (001), Santander (033), Banrisul (041), Caixa Econômica Federal (104),
 * Bradesco (237), Nubank (260, Verhoeff), Itaú Unibanco (341), HSBC/Kirton (399) and
 * Citibank (745).
 *
 * Banks validated by structure only, because they publish no check digit rule:
 * Inter (077), Ailos (085), XP (102), Unicred (136), Stone (197), BTG Pactual (208),
 * Original (212), PagBank (290), BMG (318), Mercado Pago (323), C6 (336), PicPay (380),
 * Cora (403), Pan (623), BV (655), Daycoval (707), Modal (746), Sicredi (748) and Sicoob (756).
 * For those the agency and account only need to match the documented digit lengths.
 *
 * Every other bank of the list falls back to a generic modulus 10 and modulus 11 check.
 *
 * @param {IsValidBankAccountOptions} params - The bank account parameters.
 * @param {string} params.bankCode - The bank code (3 digits), as published by Banco Central.
 * @param {string} params.agency - The agency number (1-5 digits).
 * @param {string} params.account - The account number (1-13 digits). For Caixa, operação + conta.
 * @param {string} params.digit - The verification digit (1-2 digits, or "X" for Banco do Brasil and "P" for Bradesco).
 * @returns {boolean} True if the bank account is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidBankAccount({ bankCode: "001", agency: "1584", account: "00210169", digit: "6" }); // true
 * isValidBankAccount({ bankCode: "041", agency: "2664", account: "358507670", digit: "6" }); // true
 * isValidBankAccount({ bankCode: "260", agency: "0001", account: "5216125", digit: "0" }); // true
 * isValidBankAccount({ bankCode: "999", agency: "1234", account: "123456", digit: "6" }); // false
 * ```
 *
 * Only bank codes present in the bundled Banco Central participant table are accepted; that table is
 * regenerated weekly by the datasets workflow, so a bank created after the release becomes valid
 * on the next release.
 *
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv
 * @see Based on: https://github.com/eduardokum/laravel-boleto/blob/master/manuais/Regras%20Validacao%20Conta%20Corrente%20VI_EPS.pdf
 * Icatu Seguros compendium of per bank agency/account check digit rules.
 * @see Based on: https://github.com/ajmiciano/banktools-br/tree/master/lib/banktools-br/banks
 * @see Based on: https://github.com/luizalabs/heimdall/blob/main/heimdall_valid_bank/calculate_number_account.py
 * @see Based on: https://github.com/Xerpa/bran_checker/tree/master/lib/banks
 */
export const isValidBankAccount = (params: IsValidBankAccountOptions): boolean => {
	if (isNullish(params) || typeof params !== "object") return false;

	const { bankCode, agency, account, digit } = params;

	if (
		// Stryker disable next-line ConditionalExpression,LogicalOperator: bankCode, agency, account and digit are typed as strings, so the only falsy value any of them can take is "", which the length checks below (once sanitized) reject on their own regardless of this chain.
		!bankCode ||
		!agency ||
		!account ||
		!digit ||
		typeof bankCode !== "string" ||
		typeof agency !== "string" ||
		typeof account !== "string" ||
		typeof digit !== "string"
	) {
		return false;
	}

	const bankCodeDigits = sanitizeToDigits(bankCode);
	const agencyDigits = sanitizeToDigits(agency);
	const accountDigits = sanitizeToDigits(account);
	const checkDigit = sanitizeCheckDigit(digit);

	if (bankCodeDigits.length !== 3) return false;
	if (agencyDigits.length === 0 || agencyDigits.length > 5) return false;
	if (accountDigits.length === 0 || accountDigits.length > 13) return false;
	// Stryker disable next-line ConditionalExpression,LogicalOperator: every path below also rejects a malformed checkDigit on its own — validateWithRule requires digit.length===1 before it ever compares, and validateGeneric compares against 1 or 2 character strings, so a 0, 3+ character checkDigit can never match either way.
	if (checkDigit.length === 0 || checkDigit.length > 2) return false;

	if (!isListedBankCode(bankCodeDigits)) return false;

	const rule = findRule(bankCodeDigits);

	if (rule !== null) return validateWithRule(rule, agencyDigits, accountDigits, checkDigit);

	return validateGeneric(accountDigits, checkDigit);
};
