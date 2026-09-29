import { FORMAT_REGEX } from "../constants/nfse-key";

/**
 * Reads the 50 characters of a national NFS-e access key out of a value written in one of the
 * forms `isValidNfseKey` accepts: the bare key, the key behind the `NFS` literal of the XML `Id`,
 * or the key with whitespace, `.`, `-` or `/` at the boundaries of its fields, with optional
 * surrounding whitespace. Letters are upper cased. Only the shape is read; the fields and the
 * check digit are left to `isValidNfseKey`.
 *
 * @param {string} value - The access key as written.
 * @returns {string|null} The 50 character key, or `null` when the value is not written in one of
 * those forms.
 *
 * @example
 * ```typescript
 * readNfseKey("3550308 2 2 58716523000119 0000000000012 2601 135792468 3");
 * // "35503082258716523000119000000000001226011357924683"
 * readNfseKey("3550308225871652300011900000000000122601135792468-3"); // null (inside a field)
 * ```
 */
export const readNfseKey = (value: string): string | null => {
	const match = FORMAT_REGEX.exec(value.trim());

	return match === null ? null : match.slice(1).join("").toUpperCase();
};
