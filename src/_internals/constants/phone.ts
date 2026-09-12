/**
 * Brazilian phone numbering: `55` is the E.164 country code, `00` the international
 * prefix dialed from Brazil, and a national number is DDD + 8 or 9 digits.
 *
 * @see Official: https://www.itu.int/dms_pub/itu-t/opb/sp/T-SP-E.164C-2011-PDF-E.pdf
 */

export const PHONE_COUNTRY_CODE = "55";

const PHONE_INTERNATIONAL_PREFIX = "00";

export const PHONE_COUNTRY_CODE_PREFIXES = [
	`${PHONE_INTERNATIONAL_PREFIX}${PHONE_COUNTRY_CODE}`,
	PHONE_COUNTRY_CODE,
];

export const PHONE_NATIONAL_MIN_LENGTH = 10;

export const PHONE_NATIONAL_MAX_LENGTH = 11;
