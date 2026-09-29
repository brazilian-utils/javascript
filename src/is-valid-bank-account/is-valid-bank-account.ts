import { findCodeIndex } from "../_internals/find-code-index/find-code-index";
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
export type IsValidBankAccountParams = {
	/** Three digit bank code (COMPE), e.g. "001" for Banco do Brasil. */
	bankCode: string;
	/** Agency number, digits only, without its own check digit. */
	agency: string;
	/** Account number, digits only, without the check digit. */
	account: string;
	/**
	 * The account check digit: one or two characters, or "X" for Banco do Brasil and "P" for
	 * Bradesco. Banks with a published rule take a single character; the generic fallback also
	 * accepts two, chaining mod10 and mod11 over the account.
	 */
	digit: string;
};

/**
 * The bank account `isValidBankAccount` checks: the bank, the agency and the account with its
 * check digit.
 *
 * Kept from 2.3.0: the name violates the naming rule (`Options` is the type of a second,
 * usually optional, argument, and this object is the only argument `isValidBankAccount` takes),
 * but it shipped in 2.3.0 as the canonical name, so it stays as an alias until v3.
 *
 * @deprecated Use `IsValidBankAccountParams` instead.
 */
export type IsValidBankAccountOptions = IsValidBankAccountParams;

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

const CAIXA_ACCOUNT_LENGTH = 12;

const caixaModulus11 = (value: string): string => {
	const digit = mod11(value, { variant: "bank" });

	return String(digit === 10 ? 0 : digit);
};

/**
 * The Caixa check digits of an account. A 12 digit account is the format the Caixa layouts
 * describe, "sem operação", and takes either of the two digits they define: the account's own
 * (note NE051) and the agency/account one (NE052). An 11 digit account is operação (3 digits) +
 * conta (8 digits), the older format, with the agency/account digit of the compendium.
 *
 * @param {string} agency - The 4 digit agency.
 * @param {string} account - The 11 or 12 digit account.
 * @returns {string[]} The check digits the account may carry.
 */
const caixaDigits: BankAccountDigits = (agency, account) =>
	account.length === CAIXA_ACCOUNT_LENGTH
		? [caixaModulus11(account), caixaModulus11(agency + account)]
		: [caixaModulus11(agency + account)];

const bradescoDigits: BankAccountDigits = (_agency, account) => {
	const digit = mod11(account, { variant: "bank", maxWeight: 7 });

	return digit === 10 ? ["P"] : [String(digit)];
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
		maxAccountLength: 12,
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

/**
 * Whether the bank code is in the COMPE table. The lookup is a return value, not a condition: the
 * build inlines an imported constant read in a condition, which copied the whole `COMPE_CODES`
 * literal into the scan a second time.
 * @param {string} bankCode - The bank code to look up.
 * @returns {boolean} Whether the code is listed.
 */
const isListedBankCode = (bankCode: string): boolean => findCodeIndex(COMPE_CODES, bankCode) !== -1;

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
 * Banks validated by a check digit rule:
 * Banco do Brasil (001), Santander (033), Banrisul (041), Caixa Econômica Federal (104),
 * Bradesco (237), Itaú Unibanco (341), HSBC/Kirton (399) and Citibank (745), with the rules
 * of the "Regras de Validação de dígito verificador de agência e conta corrente" compendium
 * of Icatu Seguros, and Nubank (260), with a Verhoeff check digit. No act of the Banco
 * Central, of another government body or of Febraban sets any of these rules, and the
 * compendium is a private compilation of the rules of each bank. Three banks publish their own
 * in their layout manuals, cited below, and the rules here match them: the Caixa both of its
 * digits, over a 12 digit account (module 11, weights 2 to 9 from the right, a result above 9
 * giving 0; its example, account 000000109990 with digit 6 and agency 0161 with
 * agency/account digit 5, is accepted), Santander the account digit (its example, agency 2001
 * and account 01 038237 with digit 7, is accepted), and Banco do Brasil only the agency digit
 * (module 11, weights 9 to 2 from the right, remainder 10 giving "X"), the account digit being
 * "módulo 11" and the rule here the same one. The agency digit itself is not checked here: an
 * agency of 5 digits is only held to the length, whatever its last digit is. The Caixa layouts describe the account with 12
 * digits, "sem operação"; the older operação (3 digits) + conta (8 digits) form keeps the
 * compendium rule. Up to 2.4.0 a 12 digit Caixa account was rejected. Nubank publishes no rule
 * at all; its Verhoeff digit is the one the open source validators listed below derived from
 * real accounts. The FEBRABAN Layout Padrão CNAB 240 v11.0 (11/09/2026), notes G009, G011 and G012,
 * defines each of the agency, account and agency/account check digits only as a "código adotado
 * pelo Banco responsável pela conta corrente", allows it to be alphanumeric and a 2 position
 * account digit, and gives no algorithm; the DICT API of the Banco Central takes the account
 * "incluindo verificador. Se verificador for letra, substituir por 0" and computes nothing.
 *
 * Banks validated by structure only, because no check digit rule of theirs is known:
 * Inter (077), Ailos (085), XP (102), Unicred (136), Stone (197), BTG Pactual (208),
 * Original (212), PagBank (290), BMG (318), Mercado Pago (323), C6 (336), PicPay (380),
 * Cora (403), Pan (623), BV (655), Daycoval (707), Sicredi (748) and Sicoob (756).
 * For those the agency and account only need to match the documented digit lengths.
 *
 * Every other bank of the list falls back to a generic check that accepts a `digit` passing the
 * modulus 10, the boleto modulus 11 or the bank modulus 11 of the account, so up to three of the
 * ten digits pass for a given account. No published rule backs that fallback: `true` for a bank
 * outside the lists above says the structure is plausible, not that the check digit is proven.
 *
 * @param {IsValidBankAccountParams} params - The bank account parameters.
 * @param {string} params.bankCode - The bank code (3 digits), as published by Banco Central.
 * @param {string} params.agency - The agency number (1-5 digits).
 * @param {string} params.account - The account number (1-13 digits). For Caixa, the 12 digit
 * account, or operação + conta (11 digits).
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
 * @see Official: https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20padrao%20CNAB240%20V%2011_0%20-%202026_09_11.pdf
 * FEBRABAN, Layout Padrão CNAB 240 v11.0 (11/09/2026), notes G009 to G012: "Código adotado pelo
 * Banco", with no algorithm.
 * @see Official: https://www.caixa.gov.br/Downloads/cobranca-caixa/Manual_de_Leiaute_de_Arquivo_Eletronico_CNAB_400.pdf
 * Caixa, Leiaute CNAB 400 – Cobrança Bancária CAIXA – SIGCB, 67.126 v029 (May 2024), notes NE051
 * (account digit) and NE052 (agency/account digit), each with a worked example.
 * @see Official: https://www.caixa.gov.br/Downloads/cobranca-caixa/Manual_de_Leiaute_de_Arquivo_Eletronico_CNAB_240.pdf
 * Caixa, Leiaute CNAB 240 – Cobrança Bancária CAIXA, 67.118 v031 (February 2024), note G011, the
 * same account digit example.
 * @see Official: https://www.santander.com.br/layout-de-arquivos
 * Santander, Layout de Arquivo – Débito Automático – 150 posições, versão 08 (April 2026), "Cálculo
 * do Dígito Verificador (DV) da Conta Corrente".
 * @see Official: https://www.bb.com.br/docs/pub/emp/empl/dwn/Doc5175Bloqueto.pdf
 * Banco do Brasil, Especificações Técnicas para Confecção de Boleto de Pagamento (May 2019),
 * Anexo XI, the módulo 11 of the "prefixo da agência".
 * @see Based on: https://github.com/eduardokum/laravel-boleto/blob/master/manuais/Regras%20Validacao%20Conta%20Corrente%20VI_EPS.pdf
 * Icatu Seguros compendium of per bank agency/account check digit rules.
 * @see Based on: https://github.com/ajmiciano/banktools-br/tree/master/lib/banktools-br/banks
 * @see Based on: https://github.com/luizalabs/heimdall/blob/main/heimdall_valid_bank/calculate_number_account.py
 * @see Based on: https://github.com/Xerpa/bran_checker/tree/master/lib/banks
 */
export const isValidBankAccount = (params: IsValidBankAccountParams): boolean => {
	if (isNullish(params) || typeof params !== "object") return false;

	const { bankCode, agency, account, digit } = params;

	if (
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

	if (agencyDigits.length === 0 || agencyDigits.length > 5) return false;
	if (accountDigits.length === 0 || accountDigits.length > 13) return false;
	// Stryker disable next-line ConditionalExpression,LogicalOperator: every path below also rejects a malformed checkDigit on its own: validateWithRule requires digit.length===1 before it ever compares, and validateGeneric compares against 1 or 2 character strings, so a 0, 3+ character checkDigit can never match either way.
	if (checkDigit.length === 0 || checkDigit.length > 2) return false;

	if (!isListedBankCode(bankCodeDigits)) return false;

	const rule = findRule(bankCodeDigits);

	if (rule !== null) return validateWithRule(rule, agencyDigits, accountDigits, checkDigit);

	return validateGeneric(accountDigits, checkDigit);
};
