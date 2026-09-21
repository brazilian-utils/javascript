// Code generated from spec/bridge/source/get-address-info-by-cep.ts. DO NOT EDIT.

/** Address lookup by CEP, written once. */

import { anyFailedWith, asString, firstSuccess, httpGet, isList, isNumber, jsonInt, jsonIsTrue, jsonString, jsonTruthy, keepClass, listHas, padStart, patternTest, startAll, type Attempts, type CharClass, type PatternStep } from "./_runtime.ts";

const class0: CharClass = [[0x30, 0x39]];

const PATTERN_CEP_FORMAT: readonly PatternStep[] = [
	{ charClass: class0, min: 8, max: 8, capture: false },
];

const DEFAULT_PROVIDERS: CepProvider[] = ["viacep", "brasilapi"];
const KNOWN_PROVIDERS: CepProvider[] = ["viacep", "widenet", "brasilapi"];
const BRASIL_API_NOT_FOUND_STATUS = 404;
const HTTP_RETRIES = 2;
const HTTP_RETRY_DELAY_MS = 250;

/**
 * The CEP services `getAddressInfoByCep` can query.
 */
export type CepProvider =
	| "viacep"
	| "widenet"
	| "brasilapi";

/** Base class of every error `getAddressInfoByCep` rejects with. */
export class GetAddressInfoByCepError extends Error {
	public constructor(message: string) {
		super(message);
		this.name = "GetAddressInfoByCepError";
	}
}

/** Thrown by `getAddressInfoByCep` when the value given is not a valid CEP. */
export class GetAddressInfoByCepValidationError extends GetAddressInfoByCepError {
	public constructor(message: string) {
		super(message);
		this.name = "GetAddressInfoByCepValidationError";
	}
}

/** Thrown by `getAddressInfoByCep` when no CEP service knows the CEP. */
export class GetAddressInfoByCepNotFoundError extends GetAddressInfoByCepError {
	public constructor(message: string) {
		super(message);
		this.name = "GetAddressInfoByCepNotFoundError";
	}
}

/** Thrown by `getAddressInfoByCep` when every CEP service failed to answer. */
export class GetAddressInfoByCepServiceError extends GetAddressInfoByCepError {
	public constructor(message: string) {
		super(message);
		this.name = "GetAddressInfoByCepServiceError";
	}
}

/** Raised inside a provider that did not answer. Only whether a failure was a not found is looked at when the provider failures are aggregated, so this one never leaves the module. */
class CepProviderFailure extends Error {
	public constructor(message: string) {
		super(message);
		this.name = "CepProviderFailure";
	}
}

/** The address `getAddressInfoByCep` returns for a CEP. */
export type AddressInfo = {
	/** The 8 digit CEP, no mask. */
	cep: string;
	/** Two letter state code, e.g. "SP". */
	state: string;
	/** City name. */
	city: string;
	/** Neighborhood name, empty when the CEP covers a whole city. */
	neighborhood: string;
	/** Street name, empty when the CEP covers a whole city. */
	street: string;
};

/** Options of `getAddressInfoByCep`. */
export type GetAddressInfoByCepOptions = {
	/** Which CEP services to race, in the order given (default: `["viacep", "brasilapi"]`; the deprecated `"widenet"` provider is excluded from the default list, but can still be requested explicitly). */
	providers?: CepProvider[];
};



/**
 * Reads the address ViaCEP answers with.
 *
 * @param {string} cep - The 8 digit CEP.
 * @returns {AddressInfo} The address.
 *
 * @see Based on: https://viacep.com.br/
 */
const fetchViaCep = async (cep: string): Promise<AddressInfo> => {
	const response = await httpGet((("https://viacep.com.br/ws/" + cep) + "/json/"), HTTP_RETRIES, HTTP_RETRY_DELAY_MS);
	if (!response.ok) {
		throw new CepProviderFailure("ViaCEP request failed");
	}
	const found = jsonString(response.body, "cep");
	if ((jsonTruthy(response.body, "erro") || (found === ""))) {
		throw new GetAddressInfoByCepNotFoundError("CEP n\u{e3}o encontrado");
	}
	return { cep: keepClass(class0, found), state: jsonString(response.body, "uf"), city: jsonString(response.body, "localidade"), neighborhood: jsonString(response.body, "bairro"), street: jsonString(response.body, "logradouro") };
};

/**
 * Reads the address Widenet answers with.
 *
 * @param {string} cep - The 8 digit CEP.
 * @returns {AddressInfo} The address.
 */
const fetchWidenet = async (cep: string): Promise<AddressInfo> => {
	const response = await httpGet((("https://apps.widenet.com.br/busca-cep/api/cep/" + cep) + ".json"), HTTP_RETRIES, HTTP_RETRY_DELAY_MS);
	if (!response.ok) {
		throw new CepProviderFailure("Widenet request failed");
	}
	const found = jsonString(response.body, "code");
	if ((((jsonInt(response.body, "status") !== 200) || !jsonIsTrue(response.body, "ok")) || (found === ""))) {
		throw new GetAddressInfoByCepNotFoundError("CEP n\u{e3}o encontrado");
	}
	return { cep: keepClass(class0, found), state: jsonString(response.body, "state"), city: jsonString(response.body, "city"), neighborhood: jsonString(response.body, "district"), street: jsonString(response.body, "address") };
};

/**
 * Reads the address BrasilAPI answers with.
 *
 * @param {string} cep - The 8 digit CEP.
 * @returns {AddressInfo} The address.
 *
 * @see Based on: https://brasilapi.com.br/docs#tag/CEP
 */
const fetchBrasilApi = async (cep: string): Promise<AddressInfo> => {
	const response = await httpGet((("https://brasilapi.com.br/api/cep/v1/" + cep) + ""), HTTP_RETRIES, HTTP_RETRY_DELAY_MS);
	if ((response.status === BRASIL_API_NOT_FOUND_STATUS)) {
		throw new GetAddressInfoByCepNotFoundError("CEP n\u{e3}o encontrado");
	}
	if (!response.ok) {
		throw new CepProviderFailure("BrasilAPI request failed");
	}
	const found = jsonString(response.body, "cep");
	if ((jsonTruthy(response.body, "errors") || (found === ""))) {
		throw new GetAddressInfoByCepNotFoundError("CEP n\u{e3}o encontrado");
	}
	return { cep: keepClass(class0, found), state: jsonString(response.body, "state"), city: jsonString(response.body, "city"), neighborhood: jsonString(response.body, "neighborhood"), street: jsonString(response.body, "street") };
};

/**
 * Asks one named provider for a CEP.
 *
 * @param {CepProvider} provider - The provider name.
 * @param {string} cep - The 8 digit CEP.
 * @returns {AddressInfo} The address.
 */
const fetchProvider = async (provider: CepProvider, cep: string): Promise<AddressInfo> => {
	if ((provider === "viacep")) {
		return await fetchViaCep(cep);
	}
	if ((provider === "widenet")) {
		return await fetchWidenet(cep);
	}
	return await fetchBrasilApi(cep);
};

/**
 * The providers of a list that are known, in the order they were given.
 *
 * @param {CepProvider[]} given - The names the caller asked for.
 * @returns {CepProvider[]} The known ones.
 */
const knownProviders = (given: CepProvider[]): CepProvider[] => {
	const kept: CepProvider[] = [];
	for (const provider of given) {
		if (listHas(KNOWN_PROVIDERS, provider)) {
			kept.push(provider);
		}
	}
	return kept;
};

/**
 * Fetches address information for a given CEP using multiple providers simultaneously.
 * Returns the result from the first provider that responds successfully.
 *
 * The providers are started together and raced, not tried one after the other, so a provider
 * that is retrying delays nothing for the others: its retries only push back the moment its own
 * failure lands, and therefore the moment an all-failed rejection can surface.
 *
 * @param {string|number} cep - The CEP (Brazilian postal code) to search for. Can be a string or number.
 * @param {GetAddressInfoByCepOptions} options - Optional configuration for the function.
 * @param {CepProvider[]} options.providers - List of providers to use. Defaults to `["viacep", "brasilapi"]`
 * if not specified (the deprecated `"widenet"` provider is excluded from the default list, but can still
 * be requested explicitly).
 * @returns {Promise<AddressInfo>} A promise that resolves to the address information.
 * @throws {GetAddressInfoByCepValidationError} If the CEP format is invalid, or if
 * `options.providers` is given and names no known provider: an empty array, an array of unknown
 * names, and a value that is not an array at all (`null` included) all reject this way rather
 * than with a raw `TypeError`.
 * @throws {GetAddressInfoByCepNotFoundError} If the CEP is not found in any of the services.
 * @throws {GetAddressInfoByCepServiceError} If all services are unavailable.
 *
 * @example
 * ```typescript
 * // Using the default providers (["viacep", "brasilapi"])
 * const address = await getAddressInfoByCep("01310100");
 *
 * // Using specific providers
 * const address = await getAddressInfoByCep("01310-100", {
 *   providers: ["viacep", "brasilapi"]
 * });
 *
 * // Using number input
 * const address = await getAddressInfoByCep(1310100);
 * ```
 *
 * @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/tudo-sobre-cep
 * @see Based on: https://viacep.com.br/
 * ViaCEP, one of the two default providers. A third-party service, not a Correios one.
 * @see Based on: https://brasilapi.com.br/docs#tag/CEP
 * BrasilAPI, the other default provider. A third-party service, not a Correios one.
 */
export const getAddressInfoByCep = async (cep: string | number, options?: GetAddressInfoByCepOptions): Promise<AddressInfo> => {
	const optionsProviders = options?.providers;
	let digits = keepClass(class0, asString(cep));
	if (isNumber(cep)) {
		digits = padStart(digits, 8, "0");
	}
	if (!patternTest(PATTERN_CEP_FORMAT, digits)) {
		throw new GetAddressInfoByCepValidationError("CEP inv\u{e1}lido");
	}
	let chosen = DEFAULT_PROVIDERS;
	if ((optionsProviders !== undefined)) {
		if (!isList(optionsProviders)) {
			throw new GetAddressInfoByCepValidationError("Nenhum provedor v\u{e1}lido especificado");
		}
		chosen = knownProviders(optionsProviders);
		if ((chosen.length === 0)) {
			throw new GetAddressInfoByCepValidationError("Nenhum provedor v\u{e1}lido especificado");
		}
	}
	const attempts = startAll(fetchProvider, chosen, digits);
	const found = await firstSuccess(attempts);
	if ((found !== undefined)) {
		return found;
	}
	if (anyFailedWith(attempts, "GetAddressInfoByCepNotFoundError")) {
		throw new GetAddressInfoByCepNotFoundError("CEP n\u{e3}o encontrado em nenhum servi\u{e7}o");
	}
	throw new GetAddressInfoByCepServiceError("Todos os servi\u{e7}os est\u{e3}o fora de servi\u{e7}o ou indispon\u{ed}veis");
};
