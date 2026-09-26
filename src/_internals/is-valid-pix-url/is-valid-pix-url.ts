/**
 * A host name of dot-separated labels (each alphanumeric, with inner hyphens), followed by any
 * number of `/` path segments of unreserved and sub-delimiter characters or percent-encoded
 * octets. A literal, not a `new RegExp` built from pieces, so a bundle that never calls
 * `isValidPixUrl` drops it.
 */
const PIX_URL_REGEX =
	// eslint-disable-next-line sonarjs/regex-complexity -- the literal spells out the host label twice; splitting it would bring back the runtime `new RegExp` this literal replaces.
	/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?:\/(?:%[0-9a-f]{2}|[a-z0-9._~!$&'()*+,;=:@-])*)*$/i;

/**
 * Checks whether a value is a Pix PSP location, the value of field 26-25 of a dynamic BR Code:
 * a host name with at least one dot, optionally followed by a path, written without a scheme,
 * whitespace or characters outside the URL unreserved and sub-delimiter sets. A `%` is only
 * accepted as the start of a percent-encoded octet (`%` followed by two hexadecimal digits).
 *
 * @param {string} value - The value to check.
 * @returns {boolean} True if `value` is a valid Pix PSP location.
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
 */
export const isValidPixUrl = (value: string): boolean => PIX_URL_REGEX.test(value);
