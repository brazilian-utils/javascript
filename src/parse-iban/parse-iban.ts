import { sanitizeToAlphanumeric } from "../_internals/sanitize-to-alphanumeric/sanitize-to-alphanumeric";
import { isValidIban } from "../is-valid-iban/is-valid-iban";

export type Iban = {
	/** ISO 3166-1 alpha-2 country code. Always `"BR"`, the only country this parser supports. */
	countryCode: "BR";
	/** The 2 digit ISO 7064 MOD 97-10 check digits. */
	checkDigits: string;
	/** The 8 digit ISPB (Identificador do Sistema de Pagamentos Brasileiro) of the institution. */
	bankIspb: string;
	/** The 5 digit branch (agência) number, zero-padded. */
	branch: string;
	/** The 10 digit account (conta) number, zero-padded. */
	account: string;
	/** The account type: `"C"` for conta corrente, `"P"` for conta poupança. */
	accountType: "C" | "P";
	/** The 1 character alphanumeric owner indicator, distinguishing co-owners of the same account. */
	owner: string;
};

const COUNTRY_CODE_LENGTH = 2;
const CHECK_DIGITS_LENGTH = 2;
const ISPB_LENGTH = 8;
const BRANCH_LENGTH = 5;
const ACCOUNT_LENGTH = 10;
const ACCOUNT_TYPE_LENGTH = 1;

const COUNTRY_CODE_END = COUNTRY_CODE_LENGTH;
const CHECK_DIGITS_END = COUNTRY_CODE_END + CHECK_DIGITS_LENGTH;
const ISPB_END = CHECK_DIGITS_END + ISPB_LENGTH;
const BRANCH_END = ISPB_END + BRANCH_LENGTH;
const ACCOUNT_END = BRANCH_END + ACCOUNT_LENGTH;
const ACCOUNT_TYPE_END = ACCOUNT_END + ACCOUNT_TYPE_LENGTH;

/**
 * Parses a Brazilian IBAN (International Bank Account Number) into its fields.
 *
 * The 29 character Brazilian IBAN is laid out as 2 (country code, always `BR`) + 2 (ISO 7064
 * MOD 97-10 check digits) + 8 (ISPB) + 5 (branch) + 10 (account) + 1 (account type, `C` or `P`)
 * + 1 (owner indicator). Only Brazilian IBANs are supported: the field layout of the other ISO
 * 13616 countries is out of scope, so a well-formed non `BR` IBAN also returns `null`.
 *
 * Accepts the same input forms as `isValidIban` (grouping spaces, lowercase) and returns `null`
 * whenever `isValidIban` would return `false`.
 *
 * @param {string} value - The IBAN to be parsed.
 * @returns {Iban|null} The parsed IBAN, or `null` when it is not a valid Brazilian IBAN.
 *
 * @example
 * ```typescript
 * parseIban("BR1500000000000010932840814P2");
 * // {
 * //   countryCode: "BR",
 * //   checkDigits: "15",
 * //   bankIspb: "00000000",
 * //   branch: "00001",
 * //   account: "0932840814",
 * //   accountType: "P",
 * //   owner: "2",
 * // }
 *
 * parseIban("BR15 0000 0000 0000 1093 2840 814P 2"); // same result (grouping spaces)
 * parseIban("DE89370400440532013000"); // null (non Brazilian IBAN)
 * parseIban("BR1500000000000010932840814P3"); // null (bad check digits)
 * ```
 *
 * @see Official: https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Circular&numero=3625 Circular BCB nº 3.625/2013 (Diretrizes de Implementação do IBAN no Brasil)
 * @see Official: https://www.iso.org/standard/81090.html ISO/IEC 7064 (MOD 97-10 check digit algorithm)
 */
export const parseIban = (value: string): Iban | null => {
	if (!isValidIban(value)) return null;

	const sanitized = sanitizeToAlphanumeric(value);

	return {
		countryCode: "BR",
		checkDigits: sanitized.slice(COUNTRY_CODE_END, CHECK_DIGITS_END),
		bankIspb: sanitized.slice(CHECK_DIGITS_END, ISPB_END),
		branch: sanitized.slice(ISPB_END, BRANCH_END),
		account: sanitized.slice(BRANCH_END, ACCOUNT_END),
		accountType: sanitized.charAt(ACCOUNT_END) === "C" ? "C" : "P",
		owner: sanitized.slice(ACCOUNT_TYPE_END),
	};
};
