import { NFE_KEY_LENGTH, XML_ID_PREFIX_REGEX } from "../_internals/constants/nfe-key";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeNfeKey } from "../_internals/sanitize-nfe-key/sanitize-nfe-key";
import { toStringSafe } from "../_internals/to-string-safe/to-string-safe";

/**
 * Removes the formatting of a DF-e (Documento Fiscal eletrônico) access key (chave de acesso) and
 * returns only the characters of the key: digits, plus the letters of an alphanumeric CNPJ in
 * positions 7 to 18, the only ones the key's schema type (`[0-9]{6}[0-9A-Z]{12}[0-9]{26}`) opens
 * to letters. Those letters are kept upper cased, as `parseCnpj` does with `{ version: 2 }`; a
 * letter anywhere else is dropped like any other character outside the key.
 *
 * The `NFe`, `CTe`, `MDFe`, `BPe`, `NF3e` and `NFCom` prefixes the `Id` attribute of the
 * document's XML puts in front of the key are stripped before the key is read, with any
 * whitespace around them, the same way `isValidNfeKey` accepts them. The prefix has to go first
 * because `NF3e` carries a digit of its own that is not part of the key.
 *
 * The result is capped at the 44 characters of an access key; a shorter value passes through as
 * far as it goes, so the grouping of a key still being typed can be stripped with it. Use
 * `isValidNfeKey` to check the key and `getNfeKeyInfo` to read its fields.
 *
 * A number is only read when it is a non-negative safe integer; any other number (negative,
 * fractional, not finite or past `Number.MAX_SAFE_INTEGER`) gives an empty string.
 *
 * @param {string|number} value - The access key value to be parsed.
 * @returns {string} Up to 44 characters, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseNfeKey("3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458");
 * // "35170458716523000119550010000000121000123458"
 *
 * parseNfeKey("NFe35170458716523000119550010000000121000123458");
 * // "35170458716523000119550010000000121000123458"
 *
 * parseNfeKey("3526 0712 abc3 4501 de35 5500 1000 0001 2311 0203 0403");
 * // "35260712ABC34501DE35550010000001231102030403" (alphanumeric CNPJ)
 * parseNfeKey(-1); // "" (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf
 * Manual de Orientação do Contribuinte (MOC) NF-e, "chave de acesso", which fixes the 44
 * positions and the `Id` attribute the prefixes come from.
 * @see Official: https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=5ZkvIZt10mQ%3D
 * Nota Técnica Conjunta 2025.001 (CNPJ alfanumérico nos DF-e) and the NF-e schema package
 * PL_010 (NT 2026.004): `TChNFe`, `<xs:pattern value="[0-9]{6}[0-9A-Z]{12}[0-9]{26}"/>`.
 */
export const parseNfeKey = (value: string | number): string => {
	if (!isLookupCode(value)) return "";

	// Stryker disable next-line StringLiteral: whatever replaces the prefix is stripped again by sanitizeNfeKey unless it carries a digit, since a letter before position 7 is dropped, and the mutant's literal carries none.
	const body = toStringSafe(value).trim().replace(XML_ID_PREFIX_REGEX, "");

	return sanitizeNfeKey(body).slice(0, NFE_KEY_LENGTH);
};
