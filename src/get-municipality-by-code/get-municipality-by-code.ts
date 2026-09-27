import { DATA as CITIES_DATA, type Municipality } from "../_internals/constants/municipalities";
import { STATE_CODES } from "../_internals/constants/state-codes";
import { readLookupDigits } from "../_internals/read-lookup-digits/read-lookup-digits";

export type { Municipality } from "../_internals/constants/municipalities";

/**
 * Looks up a Brazilian municipality by its 7 digit IBGE code, published by the IBGE.
 *
 * A `code` given as a number must be a non-negative integer: a sign and a decimal point are
 * not digits, so `-3550308` and `355030.8` are rejected instead of being read as `3550308`. A
 * string may carry whitespace and hyphens; any other character makes it something other than a
 * code, so `"11abc00015"` returns `null` instead of having the letters stripped, as it was up to
 * 2.4.0.
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
 * getMunicipalityByCode("11abc00015"); // null (not read as 1100015)
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/docs/localidades
 * @see Official: https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/divisao_territorial/2025/DTB_2025.zip
 * IBGE, Divisão Territorial Brasileira 2025 (data base 31/12/2025): the same 5,571 municipality
 * codes as the bundled table.
 */
export const getMunicipalityByCode = (code: string | number): Municipality | null => {
	const digits = readLookupDigits(code);

	// Stryker disable next-line ConditionalExpression: without this guard a null matches no municipality code, all strings, so the loop below returns null all the same; the guard also narrows the type of `digits`.
	if (digits === null) return null;

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
