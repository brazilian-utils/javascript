import { DATA as CITIES_DATA, type Municipality } from "../_internals/constants/municipalities";
import { STATE_CODES } from "../_internals/constants/state-codes";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

export type { Municipality } from "../_internals/constants/municipalities";

/**
 * Looks up a Brazilian municipality by its 7 digit IBGE code, published by the IBGE.
 *
 * A `code` given as a number must be a non-negative integer: a sign and a decimal point are
 * not digits, so `-3550308` and `355030.8` are rejected instead of being read as `3550308`.
 *
 * @param {string|number} code - The 7 digit IBGE municipality code, as a string or a number.
 * @returns {Municipality|null} A fresh copy of the matching municipality, or `null` when
 * `code` is not a 7 digit code or does not match any known municipality.
 *
 * @example
 * ```typescript
 * getMunicipalityByCode("3550308"); // { code: "3550308", name: "São Paulo", stateCode: "SP" }
 * getMunicipalityByCode(3550308); // { code: "3550308", name: "São Paulo", stateCode: "SP" }
 * getMunicipalityByCode("0000000"); // null
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/docs/localidades
 */
export const getMunicipalityByCode = (code: string | number): Municipality | null => {
	if (!isLookupCode(code)) return null;

	const digits = sanitizeToDigits(code);

	// Every real municipality code is exactly 7 digits, so a `digits` of the wrong length simply
	// finds no match in the loop below; there is no need to pre-validate its length here first.
	for (const stateCode of STATE_CODES) {
		const match = CITIES_DATA[stateCode].find(
			([, municipalityCode]) => municipalityCode === digits,
		);

		if (match) return { code: digits, name: match[0], stateCode };
	}

	return null;
};
