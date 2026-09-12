const HOST_LABEL = "[a-z0-9](?:[a-z0-9-]*[a-z0-9])?";

const PIX_URL_REGEX = new RegExp(
	`^${HOST_LABEL}(?:\\.${HOST_LABEL})+(?:/[a-z0-9._~%!$&'()*+,;=:@-]*)*$`,
	"i",
);

/**
 * Checks whether a value is a Pix PSP location, the value of field 26-25 of a dynamic BR Code:
 * a host name with at least one dot, optionally followed by a path, written without a scheme,
 * whitespace or characters outside the URL unreserved and sub-delimiter sets.
 *
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
 */
export const isValidPixUrl = (value: string): boolean => PIX_URL_REGEX.test(value);
