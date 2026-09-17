import { DATA as STATES, type StateCode } from "../_internals/constants/states";
import { fetchWithRetry } from "../_internals/fetch-with-retry/fetch-with-retry";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { removeAccents } from "../remove-accents/remove-accents";

/** Base class of every error `getCepInfoByAddress` rejects with. */
export class GetCepInfoByAddressError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = "GetCepInfoByAddressError";
	}
}

/** Thrown by `getCepInfoByAddress` when the state, city or street given is missing or invalid. */
export class GetCepInfoByAddressValidationError extends GetCepInfoByAddressError {
	public constructor(message: string) {
		super(message);
		this.name = "GetCepInfoByAddressValidationError";
	}
}

/** Thrown by `getCepInfoByAddress` when no address matches the query. */
export class GetCepInfoByAddressNotFoundError extends GetCepInfoByAddressError {
	public constructor(message: string) {
		super(message);
		this.name = "GetCepInfoByAddressNotFoundError";
	}
}

/**
 * One address returned by `getCepInfoByAddress`, under the field names ViaCEP itself uses. The
 * ViaCEP payload is passed through unchanged, so every field the service sends is present and a
 * field it adds later shows up even though it is not declared here.
 */
export type CepAddressInfo = {
	/** The CEP, masked as "00000-000" the way ViaCEP returns it. */
	cep: string;
	/** Street name. */
	logradouro: string;
	/** Extra address information, e.g. a house number range. */
	complemento: string;
	/** Name of the establishment the CEP belongs to, e.g. "AC São Carlos"; empty for a street CEP. */
	unidade?: string;
	/** Neighborhood name. */
	bairro: string;
	/** City name. */
	localidade: string;
	/** Two letter state code, e.g. "SP". */
	uf: string;
	/** Full state name, e.g. "Minas Gerais". */
	estado?: string;
	/** Region name, e.g. "Sudeste". */
	regiao?: string;
	/** The 7 digit IBGE municipality code. */
	ibge?: string;
	/** GIA code, used by the São Paulo state tax authority. */
	gia?: string;
	/** Area code (DDD) of the city. */
	ddd?: string;
	/** SIAFI code of the municipality. */
	siafi?: string;
};

/** The address `getCepInfoByAddress` looks up. */
export type GetCepInfoByAddressParams = {
	/** Two letter state code, e.g. "SP". */
	federalUnit: string;
	/** City name. Must not be empty; ViaCEP itself rejects values shorter than 3 characters. */
	city: string;
	/** Street name or part of it. Must not be empty; ViaCEP itself rejects values shorter than 3 characters. */
	street: string;
};

/**
 * The address `getCepInfoByAddress` looks up, the 2.3.0 name of `GetCepInfoByAddressParams`.
 *
 * @deprecated Use `GetCepInfoByAddressParams` instead.
 */
export type GetCepInfoByAddressOptions = GetCepInfoByAddressParams;

const isStateCode = (value: string): value is StateCode =>
	STATES.some((state) => state.code === value);

const normalizeAddressPart = (value: string): string => removeAccents(value).trim();

// The ViaCEP response shape is trusted structurally (as the original implementation always
// was): every element the array holds is assumed to already match `CepAddressInfo`.
const isCepAddressInfoArray = (value: unknown): value is CepAddressInfo[] => Array.isArray(value);

/**
 * Looks every CEP of a Brazilian street up on the ViaCEP API.
 *
 * @param {GetCepInfoByAddressParams} params - The address to look up.
 * @param {string} params.federalUnit - The two letter state code (e.g. "SP").
 * @param {string} params.city - The city name.
 * @param {string} params.street - The street name, or part of it.
 * @returns {Promise<CepAddressInfo[]>} Every address matching the query.
 * @throws {GetCepInfoByAddressValidationError} When the UF, city or street is missing or invalid.
 * A `params` that is not an object at all (omitted, `null`, a string) and a `federalUnit` that is
 * not a string reject this way too, rather than with a raw `TypeError`.
 * @throws {GetCepInfoByAddressNotFoundError} When no address matches the query.
 * @throws {GetCepInfoByAddressError} When ViaCEP answers with an HTTP error status. A request
 * that cannot be performed at all rejects with the underlying `fetch` error instead.
 *
 * @example
 * ```typescript
 * await getCepInfoByAddress({ federalUnit: "MG", city: "Ouro Preto", street: "Rua Direita" });
 * // [
 * //   {
 * //     cep: "35411-152",
 * //     logradouro: "Rua Direita",
 * //     complemento: "",
 * //     unidade: "",
 * //     bairro: "Riacho (Amarantina)",
 * //     localidade: "Ouro Preto",
 * //     uf: "MG",
 * //     estado: "Minas Gerais",
 * //     regiao: "Sudeste",
 * //     ibge: "3146107",
 * //     gia: "",
 * //     ddd: "31",
 * //     siafi: "4921"
 * //   }
 * // ]
 * ```
 *
 * @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/tudo-sobre-cep
 * @see Based on: https://viacep.com.br/
 * ViaCEP, the service queried. A third-party service, not a Correios one.
 */
export const getCepInfoByAddress = async (
	params: GetCepInfoByAddressParams,
): Promise<CepAddressInfo[]> => {
	if (isNullish(params) || typeof params !== "object") {
		throw new GetCepInfoByAddressValidationError("UF, city and street are required");
	}

	const { federalUnit, city, street } = params;

	if (typeof federalUnit !== "string") {
		throw new GetCepInfoByAddressValidationError("Invalid UF: a two letter string is required");
	}

	const normalizedUf = federalUnit.trim().toUpperCase();

	if (!isStateCode(normalizedUf)) {
		throw new GetCepInfoByAddressValidationError(`Invalid UF: ${federalUnit}`);
	}

	if (!city || !street) {
		throw new GetCepInfoByAddressValidationError("City and street are required");
	}

	const response = await fetchWithRetry(
		`https://viacep.com.br/ws/${normalizedUf}/${encodeURIComponent(normalizeAddressPart(city))}/${encodeURIComponent(normalizeAddressPart(street))}/json/`,
	);

	if (!response.ok) {
		throw new GetCepInfoByAddressError(`ViaCEP request failed with status ${response.status}`);
	}

	const data: unknown = await response.json();

	if (!isCepAddressInfoArray(data) || data.length === 0) {
		throw new GetCepInfoByAddressNotFoundError(`${normalizedUf} - ${city} - ${street}`);
	}

	return data;
};
