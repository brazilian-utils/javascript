const HOST_LABEL = "[a-z0-9](?:[a-z0-9-]*[a-z0-9])?";

const PATH_CHARACTER = "(?:%[0-9a-f]{2}|[a-z0-9._~!$&'()*+,;=:@-])";

const PIX_URL_REGEX = new RegExp(
	`^${HOST_LABEL}(?:\\.${HOST_LABEL})+(?:/${PATH_CHARACTER}*)*$`,
	"i",
);

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
