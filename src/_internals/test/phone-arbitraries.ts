import * as fc from "fast-check";

import { type GeneratePhoneType } from "../../generate-phone/generate-phone";
import { VALID_AREA_CODES } from "../constants/area-codes";
import {
	SERVICE_PHONE_ABBREVIATED_LENGTH,
	SERVICE_PHONE_ABBREVIATED_ROOT_LENGTH,
	SERVICE_PHONE_ABBREVIATED_ROOTS,
	SERVICE_PHONE_NON_GEOGRAPHIC_LENGTH,
	SERVICE_PHONE_NON_GEOGRAPHIC_PREFIX_LENGTH,
	SERVICE_PHONE_NON_GEOGRAPHIC_PREFIXES,
} from "../constants/service-phone";
import { digits } from "./arbitraries";

/** Arbitraries of valid phone numbers; see `document-arbitraries.ts`. */

/**
 * @param {readonly string[]} starts The prefixes to draw from.
 * @param {number} rest How many digits follow the prefix.
 * @returns {fc.Arbitrary<string>} One of `starts` followed by `rest` digits.
 */
const prefixed = (starts: readonly string[], rest: number): fc.Arbitrary<string> =>
	fc.tuple(fc.constantFrom(...starts), digits(rest)).map((parts) => parts.join(""));

/**
 * @param {GeneratePhoneType} [type] The type of the numbers; mobile or landline by default.
 * @returns {fc.Arbitrary<string>} Valid phone numbers, unmasked and without the country code.
 */
export const phones = (type?: GeneratePhoneType): fc.Arbitrary<string> => {
	if (type === "service") {
		return fc.oneof(
			prefixed(
				SERVICE_PHONE_NON_GEOGRAPHIC_PREFIXES,
				SERVICE_PHONE_NON_GEOGRAPHIC_LENGTH - SERVICE_PHONE_NON_GEOGRAPHIC_PREFIX_LENGTH,
			),
			prefixed(
				SERVICE_PHONE_ABBREVIATED_ROOTS,
				SERVICE_PHONE_ABBREVIATED_LENGTH - SERVICE_PHONE_ABBREVIATED_ROOT_LENGTH,
			),
		);
	}

	const areaCodes = VALID_AREA_CODES.map(String);
	const mobile = prefixed(areaCodes, 8).map((value) => `${value.slice(0, 2)}9${value.slice(2)}`);
	const landline = fc
		.tuple(fc.constantFrom(...areaCodes), fc.integer({ min: 2, max: 6 }), digits(7))
		.map((parts) => parts.join(""));

	if (type === "mobile") return mobile;

	return type === "landline" ? landline : fc.oneof(mobile, landline);
};
