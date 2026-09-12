import {
	PHONE_NATIONAL_MAX_LENGTH,
	PHONE_NATIONAL_MIN_LENGTH,
} from "../_internals/constants/phone";
import { normalizePhone } from "../_internals/normalize-phone/normalize-phone";
import { stripPhoneCountryCode } from "../_internals/strip-phone-country-code/strip-phone-country-code";
import { isValidLandlinePhone } from "../is-valid-landline-phone/is-valid-landline-phone";
import { isValidMobilePhone } from "../is-valid-mobile-phone/is-valid-mobile-phone";
import { isValidServicePhone } from "../is-valid-service-phone/is-valid-service-phone";
import { DEFAULT_ACCEPT } from "./constants";

/** The Brazilian mobile numbering rule to enforce over the 11 digit number: `1` the legacy one, `2` the current one. */
export type PhoneVersion = 1 | 2;

/** The kinds of Brazilian phone number `isValidPhone` can accept. */
export type PhoneType = "mobile" | "landline" | "service";

/** Options of `isValidPhone`. */
export type IsValidPhoneOptions = {
	/** Mobile numbering rule to enforce, see `isValidMobilePhone` (default: `1`). */
	version?: PhoneVersion;
	/** Kinds of number that count as valid (default: `["mobile", "landline"]`). */
	accept?: PhoneType[];
};

/**
 * Validates a Brazilian phone number.
 *
 * A Brazilian country code (`+55`, `0055` or a bare `55`) is accepted and removed before
 * validation, under the rule documented in `parsePhone`.
 *
 * `options.accept` picks which kinds of number count as valid and defaults to
 * `["mobile", "landline"]`, i.e. geographic numbers only. Add `"service"` to also accept the
 * non-geographic numbers recognized by `isValidServicePhone`; pass `[]` to accept none.
 *
 * @param {string} value - The phone number to validate.
 * @param {IsValidPhoneOptions} options - Optional validation options.
 * @param {1|2} options.version - The mobile numbering rule to enforce, see `isValidMobilePhone`.
 * @param {PhoneType[]} options.accept - The kinds of number to accept (default: `["mobile", "landline"]`).
 * @returns {boolean} True if the phone number is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidPhone("(11) 98765-4321"); // true
 * isValidPhone("11987654321", { version: 2 }); // true
 * isValidPhone("1130000000"); // true (landline)
 * isValidPhone("+55 11 98765-4321"); // true
 * isValidPhone("08001234567"); // false (service numbers are not accepted by default)
 * isValidPhone("08001234567", { accept: ["service"] }); // true
 * isValidPhone("11987654321", { accept: [] }); // false
 * ```
 *
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 */
export const isValidPhone = (value: string, options?: IsValidPhoneOptions): boolean => {
	if (typeof value !== "string") return false;

	const requested = options?.accept;
	const accept: PhoneType[] = Array.isArray(requested) ? requested : DEFAULT_ACCEPT;

	if (accept.includes("service") && isValidServicePhone(stripPhoneCountryCode(value))) return true;

	const digits = normalizePhone(value);

	if (accept.includes("landline") && digits.length === PHONE_NATIONAL_MIN_LENGTH) {
		return isValidLandlinePhone(value);
	}

	// Stryker disable next-line ConditionalExpression: isValidMobilePhone re-derives the same digits from value and rejects any length other than PHONE_NATIONAL_MAX_LENGTH itself, so calling it with the wrong length here still correctly returns false
	if (accept.includes("mobile") && digits.length === PHONE_NATIONAL_MAX_LENGTH) {
		return isValidMobilePhone(value, options);
	}

	return false;
};
