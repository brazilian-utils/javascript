import { IBGE_UF_CODES } from "../_internals/constants/ibge-uf-codes";
import { NFE_KEY_LENGTH } from "../_internals/constants/nfe-key";
import { mod11 } from "../_internals/mod11/mod11";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { VALID_MODELS } from "./constants";

const MODELS: readonly string[] = VALID_MODELS;

const NUMBER_START = 25;
const NUMBER_END = 34;
const ABSENT_NUMBER = "000000000";

const FORMAT_REGEX = /^(?:nfe)?[\d\s]+$/i;

/**
 * Validates a DF-e (Documento Fiscal eletrônico) access key (chave de acesso).
 *
 * Covers every document that shares the same 44 digit layout: NF-e (modelo 55), NFC-e
 * (modelo 65), CT-e (modelo 57) and MDF-e (modelo 58). Accepts whitespace between digit
 * groups (the common display mask) and the `NFe` prefix found in the `Id` attribute of the
 * document's XML (e.g. `Id="NFe3517...`), which is stripped before validation.
 *
 * The key is `cUF(2) AAMM(4) CNPJ/CPF(14) mod(2) serie(3) nNF(9) tpEmis(1) cNF(8) cDV(1)`.
 * The check digit (`cDV`) is a modulus 11 over the first 43 digits, weights 2-9 cycling from
 * the right, where a remainder of 0 or 1 maps to check digit 0.
 *
 * @param {string} value - The access key value to be validated.
 * @returns {boolean} True if the access key is valid, false otherwise.
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf
 * Manual de Orientação do Contribuinte (MOC) NF-e, "chave de acesso".
 * @see Based on: https://github.com/nfephp-org/sped-common/blob/master/src/Keys.php
 * NFePHP `Keys::build`/`Keys::isValid` reference implementation.
 * @see Based on: https://github.com/vmarchesin/br-validate-dfe-access-key
 * Second reference implementation and source of additional test vectors.
 *
 * @example
 * ```typescript
 * isValidNfeKey("35170458716523000119550010000000121000123458"); // true (NF-e, SP)
 * isValidNfeKey("NFe35170458716523000119550010000000121000123458"); // true (XML Id prefix)
 * isValidNfeKey("3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458"); // true (masked)
 * isValidNfeKey("99170458716523000119550010000000121000123458"); // false (invalid cUF)
 * isValidNfeKey("35170458716523000119010010000000121000123450"); // false (invalid mod)
 * ```
 */
export const isValidNfeKey = (value: string): boolean => {
	if (typeof value !== "string" || value === "") return false;

	if (!FORMAT_REGEX.test(value.trim())) return false;

	const digits = sanitizeToDigits(value);

	if (digits.length !== NFE_KEY_LENGTH) return false;

	if (!(digits.slice(0, 2) in IBGE_UF_CODES)) return false;

	const month = Number(digits.slice(4, 6));

	if (month < 1 || month > 12) return false;

	if (!MODELS.includes(digits.slice(20, 22))) return false;

	if (digits.slice(NUMBER_START, NUMBER_END) === ABSENT_NUMBER) return false;

	const emissionType = Number(digits[34]);

	if (emissionType < 1 || emissionType > 9) return false;

	const checkDigit = Number(digits[43]);

	return mod11(digits.slice(0, 43), { variant: "arrecadacao" }) === checkDigit;
};
