import { VALID_AREA_CODES } from "../_internals/constants/area-codes";
import {
	SERVICE_PHONE_ABBREVIATED_LENGTH,
	SERVICE_PHONE_ABBREVIATED_ROOT_LENGTH,
	SERVICE_PHONE_ABBREVIATED_ROOTS,
	SERVICE_PHONE_NON_GEOGRAPHIC_LENGTH,
	SERVICE_PHONE_NON_GEOGRAPHIC_PREFIX_LENGTH,
	SERVICE_PHONE_NON_GEOGRAPHIC_PREFIXES,
} from "../_internals/constants/service-phone";
import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";

/** The kinds of phone number `generatePhone` can generate. */
export type GeneratePhoneType = "mobile" | "landline" | "service";

const randomFrom = <Item>(list: readonly Item[]): Item =>
	list[Math.floor(Math.random() * list.length)];

const randomAreaCode = (): string => randomFrom(VALID_AREA_CODES).toString();

const randomServicePhone = (): string => {
	if (Math.random() >= 0.5) {
		const prefix = randomFrom(SERVICE_PHONE_NON_GEOGRAPHIC_PREFIXES);
		const rest = SERVICE_PHONE_NON_GEOGRAPHIC_LENGTH - SERVICE_PHONE_NON_GEOGRAPHIC_PREFIX_LENGTH;

		return `${prefix}${generateRandomNumber(rest)}`;
	}

	const root = randomFrom(SERVICE_PHONE_ABBREVIATED_ROOTS);
	const rest = SERVICE_PHONE_ABBREVIATED_LENGTH - SERVICE_PHONE_ABBREVIATED_ROOT_LENGTH;

	return `${root}${generateRandomNumber(rest)}`;
};

/**
 * Generates a random, structurally-valid Brazilian phone number (DDD + subscriber number,
 * no formatting/mask applied, see `formatPhone` to format the result).
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 *
 * @param {GeneratePhoneType} [type] - `"mobile"` (9-digit number starting with 9),
 * `"landline"` (8-digit number starting with 2-6) or `"service"` (a non-geographic number,
 * either an 11-digit `0X00` one or an 8-digit `300X`/`400X` one, with no DDD). When omitted,
 * randomly generates a mobile or a landline, never a service number, since those are not
 * accepted by `isValidPhone` unless asked for.
 * @returns {string} A randomly generated phone number as a string of digits (DDD included,
 * except for service numbers, which have none).
 *
 * @example
 * ```typescript
 * generatePhone("mobile"); // e.g. "11987654321"
 * generatePhone("landline"); // e.g. "1132345678"
 * generatePhone("service"); // e.g. "08001234567" or "40041234"
 * generatePhone(); // randomly mobile or landline
 * ```
 *
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 */
export const generatePhone = (type?: GeneratePhoneType): string => {
	const areaCode = randomAreaCode();

	if (type === "landline") {
		return `${areaCode}${2 + Math.floor(Math.random() * 5)}${generateRandomNumber(7)}`;
	}

	if (type === "mobile") {
		return `${areaCode}9${generateRandomNumber(8)}`;
	}

	if (type === "service") {
		return randomServicePhone();
	}

	return Math.random() >= 0.5 ? generatePhone("mobile") : generatePhone("landline");
};
