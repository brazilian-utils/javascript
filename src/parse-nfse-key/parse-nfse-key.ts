import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { LENGTH } from "./constants";

/**
 * Removes everything but the digits from the access key (chave de acesso) of a national NFS-e.
 *
 * The `NFS` literal the `Id` attribute of `infNFSe` puts in front of the key goes away with
 * every other character that is not a digit. The result is
 * the form the leiaute stores the key in (`TSChaveNFSe`) and the one the DANFSe prints, a
 * single block of digits, so this package has no `formatNfseKey`.
 *
 * The result is capped at the 50 digits of an access key; a shorter value passes through as far
 * as it goes. Use `isValidNfseKey` to check the key and `getNfseKeyInfo` to read its fields.
 *
 * @param {string|number} value - The access key value to be parsed.
 * @returns {string} Up to 50 digits, or an empty string when there is no digit at all.
 *
 * @example
 * ```typescript
 * parseNfseKey("NFS35503082258716523000119000000000001226011357924683");
 * // "35503082258716523000119000000000001226011357924683"
 *
 * parseNfseKey("3550308 2 2 58716523000119 0000000000012 2601 135792468 3");
 * // "35503082258716523000119000000000001226011357924683"
 * ```
 *
 * @see Official: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual
 * Sistema Nacional NFS-e, current technical documentation: `NFSe-ESQUEMAS_XSD-v1.01`
 * (`tiposSimples_v1.01.xsd`), types `TSChaveNFSe` (50 digits) and `TSIdNFSe` (the `NFS` prefix).
 * @see Official: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/rtc/nt-008-se-cgnfse-danfse-20260714-v1-02.pdf
 * Nota Técnica SE/CGNFS-e 008 (DANFSe), item 2.1.1: the key is printed as a single block of 50
 * digits.
 */
export const parseNfseKey = (value: string | number): string =>
	isNullish(value) ? "" : sanitizeToDigits(value).slice(0, LENGTH);
