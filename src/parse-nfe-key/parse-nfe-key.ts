import { IBGE_UF_CODES } from "../_internals/constants/ibge-uf-codes";
import { NFE_KEY_LENGTH } from "../_internals/constants/nfe-key";
import type { StateCode } from "../_internals/constants/states";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { isValidNfeKey } from "../is-valid-nfe-key/is-valid-nfe-key";

export type NfeKeyModel = "55" | "57" | "58" | "65";

const isNfeKeyModel = (value: string): value is NfeKeyModel =>
	value === "55" || value === "57" || value === "58" || value === "65";

export type NfeKey = {
	/** Two letter code of the issuing state, read from the IBGE UF code. */
	state: StateCode;
	/** Four digit issue year. */
	year: number;
	/** Issue month, 1 to 12. */
	month: number;
	/** The 14 digit CNPJ (or zero padded CPF) of the issuer. */
	taxId: string;
	/** Document model: "55" NF-e, "57" CT-e, "58" MDF-e, "65" NFC-e. */
	model: NfeKeyModel;
	/** Document series, 0 to 999. */
	series: number;
	/** Document number, 1 to 999999999. */
	number: number;
	/** Emission type code (tpEmis), 1 to 9. */
	emissionType: number;
	/** The 8 digit numeric code (cNF) drawn by the issuer. */
	code: string;
	/** The modulo 11 check digit of the key. */
	checkDigit: number;
};

/**
 * Parses a DF-e (Documento Fiscal eletrônico) access key (chave de acesso) into its fields.
 *
 * Covers every document that shares the same 44 digit layout: NF-e (modelo 55), NFC-e
 * (modelo 65), CT-e (modelo 57) and MDF-e (modelo 58). Accepts the same input forms as
 * `isValidNfeKey` (whitespace mask, `NFe` XML `Id` prefix) and returns `null` when the key
 * is not valid.
 *
 * @param {string} value - The access key value to be parsed.
 * @returns {NfeKey | null} The parsed access key, or `null` when it is not valid.
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf
 * Manual de Orientação do Contribuinte (MOC) NF-e, "chave de acesso".
 * @see Based on: https://github.com/nfephp-org/sped-common/blob/master/src/Keys.php
 * NFePHP `Keys::build` reference implementation, source of the SP and RS test vectors.
 * @see Based on: https://github.com/vmarchesin/br-validate-dfe-access-key
 * Second reference implementation.
 *
 * @example
 * ```typescript
 * parseNfeKey("35170458716523000119550010000000121000123458");
 * // { state: "SP", year: 2017, month: 4, taxId: "58716523000119", model: "55",
 * //   series: 1, number: 12, emissionType: 1, code: "00012345", checkDigit: 8 }
 *
 * parseNfeKey("invalid"); // null
 * ```
 */
export const parseNfeKey = (value: string): NfeKey | null => {
	if (!isValidNfeKey(value)) return null;

	const digits = sanitizeToDigits(value).slice(0, NFE_KEY_LENGTH);

	const model = digits.slice(20, 22);

	/* v8 ignore next */
	if (!isNfeKeyModel(model)) return null;

	return {
		state: IBGE_UF_CODES[digits.slice(0, 2)],
		year: 2000 + Number(digits.slice(2, 4)),
		month: Number(digits.slice(4, 6)),
		taxId: digits.slice(6, 20),
		model,
		series: Number(digits.slice(22, 25)),
		number: Number(digits.slice(25, 34)),
		emissionType: Number(digits[34]),
		code: digits.slice(35, 43),
		checkDigit: Number(digits[43]),
	};
};
