import { DATA as CITIES_DATA } from "../_internals/constants/municipalities";
import { hasOwnKey } from "../_internals/has-own-key/has-own-key";
import { normalizeMunicipalityName } from "../_internals/normalize-municipality-name/normalize-municipality-name";
import { normalizeStateCode } from "../_internals/read-state-code/read-state-code";

/**
 * Looks up the 7 digit IBGE code of a Brazilian municipality by its name and the code of its
 * state, in the offline IBGE "localidades" dataset.
 *
 * The name ignores accents and casing (`ç` is read as `c`), and every run of whitespace
 * collapses into a single space, so `"conceicao  do coite"` matches `"Conceição do Coité"`; a
 * name written without a space the dataset carries does not match. The casing is folded to upper
 * case, the direction Unicode expands `"ß"` to `"SS"` in. The state code ignores casing and
 * surrounding whitespace, as every util that takes a state does. The same name in another state
 * is another municipality, so the state code is required.
 *
 * It is the synchronous, offline counterpart of `get_code_by_municipality_name` of the Python
 * library, which asks the IBGE API over the network.
 *
 * @param {string} municipalityName - The municipality name.
 * @param {string} stateCode - The two letter code of the state it belongs to, e.g. `"BA"`.
 * @returns {string|null} The 7 digit IBGE code, or `null` when the state code is not a state or
 * no municipality of that state has that name.
 *
 * @example
 * ```typescript
 * getCodeByMunicipalityName("Conceição do Coité", "Ba"); // "2908408"
 * getCodeByMunicipalityName("sao paulo", "sp"); // "3550308"
 * getCodeByMunicipalityName("São Paulo", "RJ"); // null (no São Paulo in Rio de Janeiro)
 * getCodeByMunicipalityName("Município Inexistente", "RS"); // null
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/docs/localidades
 * @see Official: https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/divisao_territorial/2025/DTB_2025.zip
 * IBGE, Divisão Territorial Brasileira 2025 (data base 31/12/2025): the same 5,571 municipalities
 * as the bundled table.
 */
export const getCodeByMunicipalityName = (
	municipalityName: string,
	stateCode: string,
): string | null => {
	const normalizedStateCode = normalizeStateCode(stateCode);

	if (!hasOwnKey(CITIES_DATA, normalizedStateCode)) return null;

	// `normalizeMunicipalityName` folds a value that is not a string, or an empty one, down to
	// `""`, which no municipality name normalizes to, so it needs no check of its own here.
	const normalizedName = normalizeMunicipalityName(municipalityName);
	const match = CITIES_DATA[normalizedStateCode].find(
		([name]) => normalizeMunicipalityName(name) === normalizedName,
	);

	return match ? match[1] : null;
};
