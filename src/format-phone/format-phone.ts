import { PHONE_NATIONAL_MIN_LENGTH } from "../_internals/constants/phone";
import {
	SERVICE_PHONE_ABBREVIATED_ROOT_LENGTH,
	SERVICE_PHONE_ABBREVIATED_ROOTS,
	SERVICE_PHONE_NON_GEOGRAPHIC_PREFIXES,
} from "../_internals/constants/service-phone";
import { format } from "../_internals/format/format";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { normalizePhone } from "../_internals/normalize-phone/normalize-phone";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { stripPhoneCountryCode } from "../_internals/strip-phone-country-code/strip-phone-country-code";
import { isValidServicePhone } from "../is-valid-service-phone/is-valid-service-phone";
import { INTERNATIONAL_MASK, INTERNATIONAL_PREFIX, LENGTH, MASK, SERVICE_MASK } from "./constants";

/** The masks `formatPhone` can apply. */
export type PhoneMask = "auto" | "e164" | "international" | "service" | "sn" | "nanp";

/** Options of `formatPhone`. */
export type FormatPhoneOptions = {
	/** Which mask to apply, or `"auto"` to pick one from the value (default: `"sn"`). */
	mask?: PhoneMask;
};

const matchesPrefix = (digits: string, prefixes: readonly string[]): boolean =>
	prefixes.some((prefix) =>
		// Stryker disable next-line ConditionalExpression,EqualityOperator,MethodExpression: every prefix list used here shares one prefix length, and both service masks only emit their first separator once the value is longer than that shared length, so this "still typing" branch can never change formatService's output, and the boundary (digits.length === prefix.length) reduces to the same string equality either way
		digits.length < prefix.length ? prefix.startsWith(digits) : digits.startsWith(prefix),
	);

const formatService = (digits: string): string => {
	if (matchesPrefix(digits, SERVICE_PHONE_NON_GEOGRAPHIC_PREFIXES)) {
		return format({ value: digits, pattern: SERVICE_MASK.nonGeographic });
	}

	if (
		matchesPrefix(
			// Stryker disable next-line MethodExpression: digits.startsWith(prefix) already holds for the full digits if and only if it holds for digits.slice(0, ROOT_LENGTH), since a root is only ever matched at its own length
			digits.slice(0, SERVICE_PHONE_ABBREVIATED_ROOT_LENGTH),
			SERVICE_PHONE_ABBREVIATED_ROOTS,
		)
	) {
		return format({ value: digits, pattern: SERVICE_MASK.abbreviated });
	}

	return digits;
};

const formatInternational = (national: string): string => {
	if (!national) return "";

	const pattern =
		national.length > PHONE_NATIONAL_MIN_LENGTH
			? INTERNATIONAL_MASK.mobile
			: INTERNATIONAL_MASK.landline;

	return `${INTERNATIONAL_PREFIX} ${format({ value: national, pattern })}`;
};

const formatE164 = (national: string): string =>
	national ? `${INTERNATIONAL_PREFIX}${national}` : "";

const resolveAutoMask = (digits: string, serviceDigits: string): Exclude<PhoneMask, "auto"> => {
	if (isValidServicePhone(serviceDigits)) return "service";

	if (normalizePhone(digits) !== digits) return "international";

	return digits.length > LENGTH.sn ? "nanp" : "sn";
};

/**
 * Formats a phone number according to Brazilian phone number patterns.
 *
 * `options.mask` accepts:
 * - `"sn"` (default): Brazilian subscriber number only, e.g. `"98765-4321"` (9 digits, no DDD).
 *   With a DDD present in `value`, `"sn"` **truncates** it, e.g. `formatPhone("11987654321")`
 *   (with `mask` omitted) returns `"11987-6543"`, silently dropping the last digit, because
 *   only the first 9 digits are used and the DDD's 2 digits are consumed as if they were part
 *   of the subscriber number.
 * - `"nanp"`: `"(00) 00000-0000"`, i.e. DDD + subscriber number (11 digits).
 * - `"auto"`: picks a mask from `value`. A leading Brazilian country code (`+55`, `0055` or a
 *   bare `55` followed by 10 or 11 digits) selects `"international"`; a service number selects
 *   `"service"`; otherwise the digit count decides, `"nanp"` when `value` has more digits than
 *   a bare subscriber number (9) and `"sn"` when it does not.
 * - `"e164"`: the ITU-T E.164 form, `"+5511987654321"`, no separators.
 * - `"international"`: the way a Brazilian number is printed for foreign callers,
 *   `"+55 11 98765-4321"` (or `"+55 11 3000-0000"` for a landline).
 * - `"service"`: service numbers, `"0800 123 4567"` for the Códigos Não Geográficos (`0300`,
 *   `0303`, `0500`, `0800`, `0900`) and `"4004-1234"` for the abbreviated `300X`/`400X` ones.
 *   Anatel specifies no display format for either, so these are the conventional groupings.
 *
 * `"e164"` and `"international"` drop the country code from `value` first, under the rule
 * documented in `parsePhone`. A service number has no E.164 form, it is not reachable from
 * abroad, so both international masks fall back to the `"service"` presentation for it, which
 * is how such numbers are printed in Brazil.
 *
 * If `value` includes a DDD (area code), pass `{ mask: "auto" }` (or `"nanp"`) explicitly,
 * do not rely on the default, since the default `"sn"` mask assumes no DDD is present.
 *
 * @param {string|number} value - The phone number to format, either as a string or a number.
 * @param {FormatPhoneOptions} [options] - Optional formatting options.
 * @param {"auto"|"sn"|"nanp"|"e164"|"international"|"service"} options.mask - The mask to apply for formatting the phone number (default: `"sn"`).
 * @returns {string} The formatted phone number as a string.
 *
 * @example
 * ```typescript
 * formatPhone("987654321"); // "98765-4321" (default "sn", no DDD)
 * formatPhone("11987654321", { mask: "auto" }); // "(11) 98765-4321"
 * formatPhone("5511987654321", { mask: "auto" }); // "+55 11 98765-4321"
 * formatPhone("08001234567", { mask: "auto" }); // "0800 123 4567"
 * formatPhone("11987654321", { mask: "e164" }); // "+5511987654321"
 * formatPhone("11987654321", { mask: "international" }); // "+55 11 98765-4321"
 * formatPhone("40041234", { mask: "service" }); // "4004-1234"
 * formatPhone("11987654321"); // "11987-6543" (BEWARE: default "sn" truncates a DDD-prefixed number)
 * ```
 *
 * @see Official: https://www.itu.int/rec/T-REC-E.164
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 */
export const formatPhone = (value: string | number, options?: FormatPhoneOptions): string => {
	if (isNullish(value)) return "";

	const enhancedValue = sanitizeToDigits(value);

	const serviceDigits = stripPhoneCountryCode(value);
	const requested = options?.mask ?? "sn";
	const mask = requested === "auto" ? resolveAutoMask(enhancedValue, serviceDigits) : requested;

	if (mask === "service") return formatService(serviceDigits);

	if (mask === "e164" || mask === "international") {
		if (isValidServicePhone(serviceDigits)) return formatService(serviceDigits);

		const national = normalizePhone(enhancedValue);

		return mask === "e164" ? formatE164(national) : formatInternational(national);
	}

	return format({ value: enhancedValue, pattern: MASK[mask] });
};
