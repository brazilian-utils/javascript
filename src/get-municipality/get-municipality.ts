import { DATA as CITIES_DATA } from "../_internals/constants/municipalities";
import { type StateCode } from "../_internals/constants/states";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { normalizeMunicipalityName } from "../_internals/normalize-municipality-name/normalize-municipality-name";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/** The `getMunicipality` query by IBGE municipality code. */
export type GetMunicipalityByCodeParams = {
	/** The 7 digit IBGE municipality code, as a string or a number. */
	code: string | number;
};

/** The `getMunicipality` query by municipality name and state code. */
export type GetMunicipalityByNameParams = {
	/** The municipality name, accents and casing ignored. */
	municipalityName: string;
	/** The two letter state code the municipality belongs to, e.g. "SP". */
	uf: string;
};

/** The two ways `getMunicipality` can be queried: by IBGE code, or by municipality name and state code. */
export type GetMunicipalityParams = GetMunicipalityByCodeParams | GetMunicipalityByNameParams;

/**
 * The `getMunicipality` query by IBGE municipality code, the 2.3.0 name of
 * `GetMunicipalityByCodeParams`.
 *
 * @deprecated Use `GetMunicipalityByCodeParams` instead.
 */
export type GetMunicipalityByCodeOptions = GetMunicipalityByCodeParams;

/**
 * The `getMunicipality` query by municipality name and state code, the 2.3.0 name of
 * `GetMunicipalityByNameParams`.
 *
 * @deprecated Use `GetMunicipalityByNameParams` instead.
 */
export type GetMunicipalityByNameOptions = GetMunicipalityByNameParams;

/**
 * The two ways `getMunicipality` can be queried, the 2.3.0 name of `GetMunicipalityParams`.
 *
 * @deprecated Use `GetMunicipalityParams` instead.
 */
export type GetMunicipalityOptions = GetMunicipalityParams;

let codeIndex: Map<string, [string, string]> | undefined;

const getMunicipalityByCode = (code: string | number): [string, string] | null => {
	if (!isLookupCode(code)) return null;

	// Stryker disable next-line ConditionalExpression: this guard only memoizes; CITIES_DATA is a module level constant that is never written to, so rebuilding the index on every call produces the very same entries, and each lookup already returns a fresh copy of the pair, leaving the repeated work unobservable.
	if (!codeIndex) {
		codeIndex = new Map();

		for (const [stateCode, municipalities] of Object.entries(CITIES_DATA)) {
			for (const [name, ibgeCode] of municipalities) {
				codeIndex.set(ibgeCode, [name, stateCode]);
			}
		}
	}

	// `Map#get` never throws and simply misses for a key of the wrong shape (a malformed, too
	// short or too long code), so only the sign and the decimal point of a numeric `code`, which
	// `sanitizeToDigits` would silently drop, have to be pre-validated above.
	const entry = codeIndex.get(sanitizeToDigits(code));

	return entry ? [...entry] : null;
};

const isStateCode = (value: string): value is StateCode => Object.hasOwn(CITIES_DATA, value);

const getMunicipalityCodeByName = ({
	municipalityName,
	uf,
}: GetMunicipalityByNameParams): string | null => {
	if (typeof uf !== "string") return null;

	const normalizedUf = uf.trim().toUpperCase();

	// Every real state code is exactly 2 uppercase letters, so a malformed `normalizedUf` (wrong
	// length, digits, ...) simply finds no match below; there is no need to pre-validate its shape.
	if (!isStateCode(normalizedUf)) return null;

	// `removeAccents` (and so `normalizeMunicipalityName`) already folds a non-string or empty
	// `municipalityName` down to `""`, which no real municipality name normalizes to, so there is
	// no need to pre-validate `municipalityName` here first.
	const normalizedName = normalizeMunicipalityName(municipalityName);
	const match = CITIES_DATA[normalizedUf].find(
		([name]) => normalizeMunicipalityName(name) === normalizedName,
	);

	return match ? match[1] : null;
};

/**
 * Looks a Brazilian municipality up by its IBGE code in the offline IBGE "localidades" dataset.
 *
 * A `code` given as a number must be a non-negative integer: a sign and a decimal point are not
 * digits, so `-3550308` and `355030.8` are rejected instead of being read as `3550308`.
 *
 * @deprecated Use `getMunicipalityByCode` instead, which is synchronous and offline; matching a
 * municipality by name is up to the application, over `getMunicipalities`.
 *
 * @param {GetMunicipalityByCodeParams} options - The `{ code }` query.
 * @returns {Promise<[string, string] | null>} A fresh `[name, uf]` pair, which the caller owns
 * and may mutate, or null when the code is malformed or unknown.
 *
 * @example
 * ```typescript
 * await getMunicipality({ code: "3550308" }); // ["São Paulo", "SP"]
 * await getMunicipality({ code: 3550308 }); // ["São Paulo", "SP"]
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/docs/localidades
 */
export function getMunicipality(
	options: GetMunicipalityByCodeParams,
): Promise<[string, string] | null>;

/**
 * Looks a Brazilian municipality's IBGE code up in the offline IBGE "localidades" dataset.
 *
 * The name lookup ignores accents and casing, and every run of whitespace collapses into a
 * single space, so `"sao  paulo"` matches `"São Paulo"`; a name written without the space does
 * not, since only the runs that are there collapse. The casing is folded to upper case, the
 * direction Unicode expands `"ß"` to `"SS"` in, so `"Paßos"` matches `"Passos"`.
 *
 * @deprecated Use `getMunicipalityByCode` instead, which is synchronous and offline; matching a
 * municipality by name is up to the application, over `getMunicipalities`.
 *
 * @param {GetMunicipalityByNameParams} options - The `{ municipalityName, uf }` query.
 * @returns {Promise<string | null>} The 7 digit IBGE code, or null when the state code or the
 * municipality is unknown.
 *
 * @example
 * ```typescript
 * await getMunicipality({ municipalityName: "sao paulo", uf: "sp" }); // "3550308"
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/docs/localidades
 */
export function getMunicipality(options: GetMunicipalityByNameParams): Promise<string | null>;

/**
 * Looks a Brazilian municipality up in the offline IBGE "localidades" dataset, from a query
 * whose direction is only known at run time.
 *
 * Given a `code` it resolves the municipality name and its UF; given a `municipalityName` and a
 * `uf` it resolves the IBGE code. Validation failures and unknown municipalities are reported
 * as `null`.
 *
 * @deprecated Use `getMunicipalityByCode` instead, which is synchronous and offline; matching a
 * municipality by name is up to the application, over `getMunicipalities`.
 *
 * @param {GetMunicipalityParams} options - Either `{ code }` or `{ municipalityName, uf }`.
 * @returns {Promise<[string, string] | string | null>} The `[name, uf]` pair when looking up
 * by code, the IBGE code when looking up by name, or null when the municipality is unknown
 * (this includes `options` itself being missing or not an object, e.g. `null`, `undefined`,
 * an array or a primitive).
 *
 * @example
 * ```typescript
 * const lookUp = (options: GetMunicipalityParams) => getMunicipality(options);
 *
 * await lookUp({ code: "3550308" }); // ["São Paulo", "SP"]
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/docs/localidades
 */
export function getMunicipality(
	options: GetMunicipalityParams,
): Promise<[string, string] | string | null>;

export function getMunicipality(
	options: GetMunicipalityParams,
): Promise<[string, string] | string | null> {
	if (isNullish(options) || typeof options !== "object" || Array.isArray(options)) {
		return Promise.resolve(null);
	}

	if ("code" in options) {
		return Promise.resolve(getMunicipalityByCode(options.code));
	}

	return Promise.resolve(getMunicipalityCodeByName(options));
}
