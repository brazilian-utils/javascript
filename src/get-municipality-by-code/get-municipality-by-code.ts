import { DATA as CITIES_DATA, type Municipality } from "../_internals/constants/cities";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { getStates } from "../get-states/get-states";

const CODE_LENGTH = 7;

/**
 * Looks up a Brazilian municipality by its 7 digit IBGE code, published by the IBGE.
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
	if (isNullish(code) || (typeof code !== "string" && typeof code !== "number")) return null;

	const digits = sanitizeToDigits(code);

	if (digits.length !== CODE_LENGTH) return null;

	for (const state of getStates()) {
		const match = CITIES_DATA[state.code].find(
			([, municipalityCode]) => municipalityCode === digits,
		);

		if (match) return { code: digits, name: match[0], stateCode: state.code };
	}

	return null;
};
