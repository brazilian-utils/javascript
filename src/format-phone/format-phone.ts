import { PHONE_NATIONAL_MIN_LENGTH } from "../_internals/constants/phone";
import {
	SERVICE_PHONE_ABBREVIATED_ROOTS,
	SERVICE_PHONE_NON_GEOGRAPHIC_PREFIXES,
} from "../_internals/constants/service-phone";
import { format } from "../_internals/format/format";
import { normalizePhone } from "../_internals/normalize-phone/normalize-phone";
import { resolveServicePhoneDigits } from "../_internals/resolve-service-phone-digits/resolve-service-phone-digits";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { isValidServicePhone } from "../is-valid-service-phone/is-valid-service-phone";
import {
	DEFAULT_MASK,
	INTERNATIONAL_PREFIX,
	MASKS,
	type NationalMask,
	OBFUSCATED_E164_MASK,
	OBFUSCATED_MASKS,
	PHONE_MASKS,
	type PhoneLineMasks,
	type PhoneMasks,
	SN_LENGTH,
} from "./constants";

/** The masks `formatPhone` can apply. */
export type PhoneMask = "auto" | "e164" | "international" | "service" | "sn" | "nanp";

/** Options of `formatPhone`. */
export type FormatPhoneOptions = {
	/** Which mask to apply, or `"auto"` to pick one from the value (default: `"sn"`). */
	mask?: PhoneMask;
	/** Whether to hide the subscriber number with `*`, except its last 2 digits (default: `false`, read for truthiness). */
	obfuscate?: boolean;
};

const matchesPrefix = (digits: string, prefixes: readonly string[]): boolean =>
	prefixes.some((prefix) => digits.startsWith(prefix));

/**
 * A value still being typed is formatted as far as it goes: it is shorter than every prefix
 * below, so it matches none of them and is returned as it came, which is exactly what both
 * masks would print for it anyway (their first separator only appears once the value is longer
 * than the prefix that selects the mask).
 *
 * Under `obfuscate` such a value has no prefix that tells which digits are safe to show, so it
 * is hidden entirely, unless it is one of the 3 digit public utility codes (`190`), which
 * identify no subscriber.
 * @param {string} digits - The digits of a service number.
 * @param {boolean} obfuscate - Whether to hide the digits after the prefix, except the last 2.
 * @returns {string} The digits under the mask of their service number family.
 */
const formatService = (digits: string, obfuscate: boolean): string => {
	const masks = obfuscate ? OBFUSCATED_MASKS.service : MASKS.service;

	if (matchesPrefix(digits, SERVICE_PHONE_NON_GEOGRAPHIC_PREFIXES)) {
		return format({ value: digits, pattern: masks.nonGeographic });
	}

	if (matchesPrefix(digits, SERVICE_PHONE_ABBREVIATED_ROOTS)) {
		return format({ value: digits, pattern: masks.abbreviated });
	}

	return obfuscate && !isValidServicePhone(digits) ? "*".repeat(digits.length) : digits;
};

const resolveLinePattern = (national: string, masks: PhoneLineMasks): string =>
	national.length > PHONE_NATIONAL_MIN_LENGTH ? masks.mobile : masks.landline;

const formatInternational = (national: string, masks: PhoneMasks): string => {
	if (!national) return "";

	const pattern = resolveLinePattern(national, masks.international);

	return `${INTERNATIONAL_PREFIX} ${format({ value: national, pattern })}`;
};

const formatE164 = (national: string, obfuscate: boolean): string => {
	if (!national) return "";

	const pattern = resolveLinePattern(national, OBFUSCATED_E164_MASK);

	return `${INTERNATIONAL_PREFIX}${obfuscate ? format({ value: national, pattern }) : national}`;
};

const resolveNationalPattern = (digits: string, mask: NationalMask, masks: PhoneMasks): string =>
	mask === "nanp" && digits.length === PHONE_NATIONAL_MIN_LENGTH
		? masks.nanpLandline
		: masks.national[mask];

const resolveAutoMask = (digits: string, serviceDigits: string): Exclude<PhoneMask, "auto"> => {
	if (isValidServicePhone(serviceDigits)) return "service";

	if (normalizePhone(digits) !== digits) return "international";

	return digits.length > SN_LENGTH ? "nanp" : "sn";
};

const isPhoneMask = (value: unknown): value is PhoneMask => PHONE_MASKS.has(value);

/**
 * Formats a phone number according to Brazilian phone number patterns.
 *
 * `options.mask` accepts:
 * - `"sn"` (default): Brazilian subscriber number only, e.g. `"98765-4321"` (9 digits, no DDD).
 *   With a DDD present in `value`, `"sn"` **truncates** it, e.g. `formatPhone("11987654321")`
 *   (with `mask` omitted) returns `"11987-6543"`, silently dropping the last digit, because
 *   only the first 9 digits are used and the DDD's 2 digits are consumed as if they were part
 *   of the subscriber number.
 * - `"nanp"`: DDD + subscriber number, `"(00) 00000-0000"` for the 11 digits of a mobile and
 *   `"(00) 0000-0000"` for the 10 digits of a landline. Any other length keeps the 11 digit
 *   grouping, so a value still being typed reads as a partial mobile.
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
 * is how such numbers are printed in Brazil. The service-number check itself reads `value`
 * under the same rule, so `"5508001234567"` is the `0800` number, not a `+55 08` one.
 *
 * If `value` includes a DDD (area code), pass `{ mask: "auto" }` (or `"nanp"`) explicitly,
 * do not rely on the default, since the default `"sn"` mask assumes no DDD is present. A `mask`
 * outside the union falls back to the default `"sn"` instead of throwing.
 *
 * `options.obfuscate` hides the subscriber number under every mask, for the places where a
 * number is shown to someone who should only recognize it (LGPD, art. 6º III, necessidade). The
 * gov.br account shows the registered mobile as `"*********00"`, only the last 2 digits, and
 * this keeps that count. The prefix that names a region or a service instead of a subscriber
 * also stays: the DDD, the `0800`-like code and the `300X`/`400X` root. A 3 digit public
 * utility code (`190`) identifies no one and is returned as it is, and a value the `"service"`
 * mask does not recognize is hidden entirely. The patterns have a fixed number of slots, so
 * under `"e164"` anything past the 11th national digit is dropped.
 *
 * @param {string|number} value - The phone number to format, either as a string or a number.
 * @param {FormatPhoneOptions} [options] - Optional formatting options.
 * @param {"auto"|"sn"|"nanp"|"e164"|"international"|"service"} options.mask - The mask to apply for formatting the phone number (default: `"sn"`).
 * @param {boolean} options.obfuscate - If truthy, hides the subscriber number except its last 2
 * digits. Read for truthiness, so a non-boolean such as `1` obfuscates too.
 * @returns {string} The formatted phone number as a string.
 *
 * @example
 * ```typescript
 * formatPhone("987654321"); // "98765-4321" (default "sn", no DDD)
 * formatPhone("11987654321", { mask: "auto" }); // "(11) 98765-4321"
 * formatPhone("1130000000", { mask: "auto" }); // "(11) 3000-0000" (10 digit landline)
 * formatPhone("5511987654321", { mask: "auto" }); // "+55 11 98765-4321"
 * formatPhone("08001234567", { mask: "auto" }); // "0800 123 4567"
 * formatPhone("5508001234567", { mask: "auto" }); // "0800 123 4567"
 * formatPhone("11987654321", { mask: "e164" }); // "+5511987654321"
 * formatPhone("11987654321", { mask: "international" }); // "+55 11 98765-4321"
 * formatPhone("40041234", { mask: "service" }); // "4004-1234"
 * formatPhone("987654321", { obfuscate: true }); // "*****-**21"
 * formatPhone("11987654321", { mask: "auto", obfuscate: true }); // "(11) *****-**21"
 * formatPhone("1130000000", { mask: "auto", obfuscate: true }); // "(11) ****-**00"
 * formatPhone("5511987654321", { mask: "auto", obfuscate: true }); // "+55 11 *****-**21"
 * formatPhone("11987654321", { mask: "e164", obfuscate: true }); // "+5511*******21"
 * formatPhone("08001234567", { mask: "auto", obfuscate: true }); // "0800 *** **67"
 * formatPhone("40041234", { mask: "service", obfuscate: true }); // "4004-**34"
 * formatPhone("11987654321"); // "11987-6543" (BEWARE: default "sn" truncates a DDD-prefixed number)
 * ```
 *
 * @see Official: https://www.itu.int/rec/T-REC-E.164
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 * @see Official: https://acesso.gov.br/faq/_perguntasdafaq/formarrecuperarconta.html
 * The gov.br account FAQ, whose "Recuperar senha com celular" screen shows the registered mobile
 * as `"*********00"`, the convention `obfuscate` follows for the number of visible digits.
 */
export const formatPhone = (value: string | number, options?: FormatPhoneOptions): string => {
	const enhancedValue = sanitizeToDigits(value);

	const serviceDigits = resolveServicePhoneDigits(value);
	const givenMask = options?.mask;
	const requested: PhoneMask = isPhoneMask(givenMask) ? givenMask : DEFAULT_MASK;
	const mask = requested === "auto" ? resolveAutoMask(enhancedValue, serviceDigits) : requested;

	const obfuscate = Boolean(options?.obfuscate);
	const masks = obfuscate ? OBFUSCATED_MASKS : MASKS;

	if (mask === "service") return formatService(serviceDigits, obfuscate);

	if (mask === "e164" || mask === "international") {
		if (isValidServicePhone(serviceDigits)) return formatService(serviceDigits, obfuscate);

		const national = normalizePhone(enhancedValue);

		return mask === "e164" ? formatE164(national, obfuscate) : formatInternational(national, masks);
	}

	return format({
		value: enhancedValue,
		pattern: resolveNationalPattern(enhancedValue, mask, masks),
	});
};
