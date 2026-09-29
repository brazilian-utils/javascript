import { XML_ID_PREFIX_REGEX } from "../_internals/constants/nfe-key";
import { format } from "../_internals/format/format";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeNfeKey } from "../_internals/sanitize-nfe-key/sanitize-nfe-key";
import { toStringSafe } from "../_internals/to-string-safe/to-string-safe";
import { PATTERN } from "./constants";

/** Options of `formatNfeKey`. */
export type FormatNfeKeyOptions = {
	/** Whether to left pad the value with zeros up to the 44 characters of a complete access key (default: `false`). */
	pad?: boolean;
};

/**
 * Formats a DF-e (Documento Fiscal eletrônico) access key (chave de acesso) into groups of 4
 * characters separated by spaces, the form every auxiliary document prints it in: the DANFE of the
 * NF-e and the NFC-e, the DACTE of the CT-e, the CT-e OS and the GTV-e, the DAMDFE of the
 * MDF-e, the DABPE of the BP-e, the DANF3E of the NF3e and the DANFE-COM of the NFCom.
 *
 * The upper cased letters of an alphanumeric CNPJ are kept in positions 7 to 18, the only ones
 * the key's schema type (`[0-9]{6}[0-9A-Z]{12}[0-9]{26}`) opens to letters; a letter anywhere
 * else is dropped like any other character outside the key, the way `parseNfeKey` reads it.
 *
 * The `NFe`, `CTe`, `MDFe`, `BPe`, `NF3e` and `NFCom` prefixes of the `Id` attribute of the
 * document's XML are stripped first, the way `parseNfeKey` reads them, so the digit of `NF3e` does
 * not end up in the key.
 *
 * Like every formatter of this package, the value is read for its characters and grouped as far
 * as they go, so a masked or partial key still being typed is grouped progressively and anything
 * that is neither a string nor a non-negative safe integer (an object, `true`, `-1`, `1.5`, a
 * bigint, an object with a null prototype) gives `""` instead of throwing. Use `isValidNfeKey` to
 * check a key.
 *
 * With `pad: true` the value is first left padded with zeros to the 44 characters of a complete
 * access key, so it always comes back fully grouped (`"12345"` gives
 * `"0000 0000 0000 0000 0000 0000 0000 0000 0000 0001 2345"`).
 *
 * The parameter is typed as a string because the 44 characters of an access key are more than a
 * JavaScript number can hold exactly. At runtime a number is read as the string of its digits,
 * like in every formatter of this package.
 *
 * @param {string} value - The access key value to be formatted.
 * @param {FormatNfeKeyOptions} [options] - Optional formatting options.
 * @param {boolean} [options.pad] - Whether to pad the value with leading zeros. Defaults to `false`.
 * @returns {string} The formatted access key, e.g. "3520 0612 3456 ...".
 *
 * @example
 * ```typescript
 * formatNfeKey("35170458716523000119550010000000121000123458");
 * // "3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458"
 *
 * formatNfeKey("35260712abc34501de35550010000001231102030403");
 * // "3526 0712 ABC3 4501 DE35 5500 1000 0001 2311 0203 0403" (alphanumeric CNPJ)
 *
 * formatNfeKey("NF3e35170458716523000119550010000000121000123458");
 * // "3517 0458 7165 2300 0119 5500 1000 0000 1210 0012 3458" (XML Id prefix)
 *
 * formatNfeKey("12345"); // "1234 5" (partial values are grouped as far as they go)
 *
 * formatNfeKey("12345", { pad: true });
 * // "0000 0000 0000 0000 0000 0000 0000 0000 0000 0001 2345"
 * ```
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf
 * Manual de Orientação do Contribuinte (MOC) NF-e, "chave de acesso".
 * @see Official: https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=5ZkvIZt10mQ%3D
 * Nota Técnica Conjunta 2025.001 (CNPJ alfanumérico nos DF-e) and the NF-e schema package
 * PL_010 (NT 2026.004): `TChNFe`, `<xs:pattern value="[0-9]{6}[0-9A-Z]{12}[0-9]{26}"/>`.
 */
export const formatNfeKey = (value: string, options?: FormatNfeKeyOptions): string =>
	isLookupCode(value)
		? format({
				pad: options?.pad,
				value: sanitizeNfeKey(toStringSafe(value).trim().replace(XML_ID_PREFIX_REGEX, "")),
				pattern: PATTERN,
			})
		: "";
