/**
 * The longest e-mail key the DICT registers: "E-mail deve possuir no máximo 77 caracteres e deve
 * ser em minúsculo" (DICT API 2.12.1, tag "Chave").
 */
export const EMAIL_MAX_LENGTH = 77;

/**
 * The regular expression the DICT API registers for an e-mail key, verbatim (DICT API 2.12.1,
 * the version the BCB publishes on its site, tag "Chave", type `EMAIL`), which requires the
 * address in lowercase ("deve ser em minúsculo"). It is not the syntax `isValidEmail` checks: the
 * local part may carry any of ``.!#$'*+/=?^_`{|}~-``, with dots anywhere (`.ab`, `a..b`, `ab.`),
 * and the domain may be a single label (`a@localhost`) or end in a numeric one (`a@example.123`).
 *
 * The `&` is not among them: the DICT API changelog, version 2.6.0 (2025-09-27), "Removido '&'
 * do conjunto de caracteres permitidos para chaves do tipo EMAIL". The GitHub repository
 * `bacen/pix-dict-api`, whose last version (1.8.0, 2022) still carries it, is marked "OBSOLETO".
 * The `components.schemas.Email` pattern of the same specification, which keeps `%` and `&`, is
 * the participant's contact address, not the Pix key.
 *
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html
 * DICT API 2.12.1, tag "Chave", type `EMAIL`.
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/changelog.html
 * DICT API changelog, version 2.6.0.
 */
export const PIX_EMAIL_REGEX =
	/^[a-z0-9.!#$'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;

/**
 * A DICT random key (EVP) is a lowercase UUID written with its punctuation, which the DICT
 * itself generates ("é gerado pelo DICT", DICT API, tag "Chave"). Neither the pattern the DICT
 * API registers (`[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`) nor its example
 * (`123e4567-e89b-12d3-a456-426655440000`) nor the one of the Pix manual
 * (`123e4567-e12b-12d1-a456-426655440000`), both with the version nibble `1`, constrains the
 * UUID version, so the version and variant nibbles are not enforced.
 */
export const EVP_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The characters a value written as a phone number may carry: digits, the `+` of the
 * international prefix and the spaces, dots, hyphens and parentheses of the usual masks.
 * Sanitizing to digits alone would read `"abc(11) 98765-4321xyz"` as a phone number, so the
 * value is matched against this before it is sanitized.
 */
export const PHONE_SYNTAX_REGEX = /^[\d ()+.-]+$/;
