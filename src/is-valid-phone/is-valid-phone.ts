import {
	PHONE_NATIONAL_MAX_LENGTH,
	PHONE_NATIONAL_MIN_LENGTH,
} from "../_internals/constants/phone";
import { normalizePhone } from "../_internals/normalize-phone/normalize-phone";
import { resolveServicePhoneDigits } from "../_internals/resolve-service-phone-digits/resolve-service-phone-digits";
import { isValidLandlinePhone } from "../is-valid-landline-phone/is-valid-landline-phone";
import { isValidMobilePhone } from "../is-valid-mobile-phone/is-valid-mobile-phone";
import { isValidServicePhone } from "../is-valid-service-phone/is-valid-service-phone";
import { DEFAULT_ACCEPT } from "./constants";

/** The Brazilian mobile numbering rule to enforce over the 11 digit number: `1` the legacy one (6, 7, 8 or 9), `2` the current one (7, 8 or 9, without the `700` series). */
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
 * `options.version` is forwarded to `isValidMobilePhone` and only affects mobile numbers:
 * `1` (the default) accepts a first number digit of 6, 7, 8 or 9, and `2` the 7, 8 and 9 of
 * Resolução Anatel nº 749/2022, art. 12, I, "a", minus its `700` satellite series.
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
 * isValidPhone("11712345678", { version: 2 }); // true (7 is SMP as well)
 * isValidPhone("11700123456", { version: 2 }); // false (the 700 series is satellite)
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

	if (accept.includes("service") && isValidServicePhone(resolveServicePhoneDigits(value)))
		return true;

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
