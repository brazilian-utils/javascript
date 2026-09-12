import { parseNfeKey } from "../parse-nfe-key/parse-nfe-key";

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
export const isValidNfeKey = (value: string): boolean => parseNfeKey(value) !== null;
