import { DATA as STATES, type StateCode } from "../_internals/constants/states";
import { fetchWithRetry } from "../_internals/fetch-with-retry/fetch-with-retry";
import { removeAccents } from "../remove-accents/remove-accents";

export class GetCepInfoByAddressError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = "GetCepInfoByAddressError";
	}
}

export class GetCepInfoByAddressValidationError extends GetCepInfoByAddressError {
	public constructor(message: string) {
		super(message);
		this.name = "GetCepInfoByAddressValidationError";
	}
}

export class GetCepInfoByAddressNotFoundError extends GetCepInfoByAddressError {
	public constructor(message: string) {
		super(message);
		this.name = "GetCepInfoByAddressNotFoundError";
	}
}

export type CepAddressInfo = {
	/** The CEP, masked as "00000-000" the way ViaCEP returns it. */
	cep: string;
	/** Street name. */
	logradouro: string;
	/** Extra address information, e.g. a house number range. */
	complemento: string;
	/** Neighborhood name. */
	bairro: string;
	/** City name. */
	localidade: string;
	/** Two letter state code, e.g. "SP". */
	uf: string;
	/** The 7 digit IBGE municipality code. */
	ibge?: string;
	/** GIA code, used by the São Paulo state tax authority. */
	gia?: string;
	/** Area code (DDD) of the city. */
	ddd?: string;
	/** SIAFI code of the municipality. */
	siafi?: string;
};

export type GetCepInfoByAddressOptions = {
	/** Two letter state code, e.g. "SP". */
	federalUnit: string;
	/** City name. Must not be empty; ViaCEP itself rejects values shorter than 3 characters. */
	city: string;
	/** Street name or part of it. Must not be empty; ViaCEP itself rejects values shorter than 3 characters. */
	street: string;
};

const isStateCode = (value: string): value is StateCode =>
	STATES.some((state) => state.code === value);

const normalizeAddressPart = (value: string): string => removeAccents(value).trim();

// The ViaCEP response shape is trusted structurally (as the original implementation always
// was): every element the array holds is assumed to already match `CepAddressInfo`.
const isCepAddressInfoArray = (value: unknown): value is CepAddressInfo[] => Array.isArray(value);

/**
 * Looks every CEP of a Brazilian street up on the ViaCEP API.
 *
 * @param {GetCepInfoByAddressOptions} params - The address to look up.
 * @param {string} params.federalUnit - The two letter state code (e.g. "SP").
 * @param {string} params.city - The city name.
 * @param {string} params.street - The street name, or part of it.
 * @returns {Promise<CepAddressInfo[]>} Every address matching the query.
 * @throws {GetCepInfoByAddressValidationError} When the UF, city or street is missing or invalid.
 * @throws {GetCepInfoByAddressNotFoundError} When no address matches the query.
 * @throws {GetCepInfoByAddressError} When ViaCEP answers with an HTTP error status. A request
 * that cannot be performed at all rejects with the underlying `fetch` error instead.
 *
 * @example
 * ```typescript
 * await getCepInfoByAddress({ federalUnit: "SP", city: "São Paulo", street: "Avenida Paulista" });
 * // [{ cep: "01310-100", logradouro: "Avenida Paulista", ... }]
 * ```
 *
 * @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/tudo-sobre-cep
 * @see Based on: https://viacep.com.br/
 */
export const getCepInfoByAddress = async ({
	federalUnit,
	city,
	street,
}: GetCepInfoByAddressOptions): Promise<CepAddressInfo[]> => {
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
