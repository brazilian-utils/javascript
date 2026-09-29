import { MUNICIPALITY_NAMES } from "../_internals/constants/municipality-names";
import { hasOwnKey } from "../_internals/has-own-key/has-own-key";
import { normalizeMunicipalityName } from "../_internals/normalize-municipality-name/normalize-municipality-name";
import { normalizeStateCode } from "../_internals/normalize-state-code/normalize-state-code";
import { readMunicipalities } from "../_internals/read-municipalities/read-municipalities";

let codesByName: Map<string, Map<string, string>> | undefined;

/** The `getCodeByMunicipalityName` query: a municipality name and the code of its state. */
export type GetCodeByMunicipalityNameParams = {
	/** The municipality name, accents, casing and runs of whitespace ignored. */
	municipalityName: string;
	/** The two letter code of the state the municipality belongs to, e.g. `"BA"`, in any case. */
	stateCode: string;
};

/**
 * Looks up the 7 digit IBGE code of a Brazilian municipality by its name and the code of its
 * state, in the offline IBGE "localidades" dataset.
 *
 * The name ignores accents and casing (`ç` is read as `c`), and every run of whitespace
 * collapses into a single space, so `"conceicao  do coite"` matches `"Conceição do Coité"`; a
 * name written without a space the dataset carries does not match. The casing is folded to upper
 * case, the direction Unicode expands `"ß"` to `"SS"` in. `stateCode` ignores casing
 * and surrounding whitespace, as every util that takes a state does. The same name in another state
 * is another municipality, so the state code is required. Missing or malformed `params`, and a
 * name that is not a string or is empty, give `null`.
 *
 * It is the synchronous, offline counterpart of `get_code_by_municipality_name` of the Python
 * library, which asks the IBGE API over the network.
 *
 * @param {GetCodeByMunicipalityNameParams} params - `municipalityName`, the municipality name,
 * and `stateCode`, the two letter code of the state it belongs to, e.g. `"BA"`.
 * @returns {string|null} The 7 digit IBGE code, or `null` when the state code is not a state or
 * no municipality of that state has that name.
 *
 * @example
 * ```typescript
 * getCodeByMunicipalityName({ municipalityName: "Conceição do Coité", stateCode: "Ba" }); // "2908408"
 * getCodeByMunicipalityName({ municipalityName: "sao paulo", stateCode: "sp" }); // "3550308"
 * getCodeByMunicipalityName({ municipalityName: "São Paulo", stateCode: "RJ" }); // null (no São Paulo in Rio de Janeiro)
 * getCodeByMunicipalityName({ municipalityName: "Município Inexistente", stateCode: "RS" }); // null
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/docs/localidades
 * @see Official: https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/divisao_territorial/2025/DTB_2025.zip
 * IBGE, Divisão Territorial Brasileira 2025 (data base 31/12/2025): the same 5,571 municipalities
 * as the bundled table.
 */
export const getCodeByMunicipalityName = (
	params: GetCodeByMunicipalityNameParams,
): string | null => {
	const normalizedStateCode = normalizeStateCode(params?.stateCode);

	if (!hasOwnKey(MUNICIPALITY_NAMES, normalizedStateCode)) return null;

	const normalizedName = normalizeMunicipalityName(params.municipalityName);

	codesByName ??= new Map();

	let index = codesByName.get(normalizedStateCode);

	if (!index) {
		index = new Map();

		const municipalities = readMunicipalities(normalizedStateCode);

		for (let position = municipalities.length - 1; position >= 0; position--) {
			const [name, code] = municipalities[position];

			index.set(normalizeMunicipalityName(name), code);
		}

		codesByName.set(normalizedStateCode, index);
	}

	return index.get(normalizedName) ?? null;
};
