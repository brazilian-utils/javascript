/**
 * Address lookup by CEP, written once.
 */
import {
	type HttpResponse,
	anyFailedWith,
	asString,
	firstSuccess,
	httpGet,
	isList,
	isNumber,
	jsonIsTrue,
	jsonInt,
	jsonString,
	jsonTruthy,
	listHas,
	startAll,
} from "./_std.ts";

/** Base class of every error `getAddressInfoByCep` rejects with. */
export class GetAddressInfoByCepError extends Error {}

/** Thrown by `getAddressInfoByCep` when the value given is not a valid CEP. */
export class GetAddressInfoByCepValidationError extends GetAddressInfoByCepError {}

/** Thrown by `getAddressInfoByCep` when no CEP service knows the CEP. */
export class GetAddressInfoByCepNotFoundError extends GetAddressInfoByCepError {}

/** Thrown by `getAddressInfoByCep` when every CEP service failed to answer. */
export class GetAddressInfoByCepServiceError extends GetAddressInfoByCepError {}

/**
 * Raised inside a provider that did not answer. Only whether a failure was a not found is
 * looked at when the provider failures are aggregated, so this one never leaves the module.
 */
class CepProviderFailure extends Error {}

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

/** The CEP services `getAddressInfoByCep` can query. */
export type CepProvider = "viacep" | "widenet" | "brasilapi";

/** Options of `getAddressInfoByCep`. */
export type GetAddressInfoByCepOptions = {
	/**
	 * Which CEP services to race, in the order given (default: `["viacep", "brasilapi"]`; the
	 * deprecated `"widenet"` provider is excluded from the default list, but can still be
	 * requested explicitly).
	 */
	providers?: CepProvider[];
};

const CEP_FORMAT = /^\d{8}$/;
const NON_DIGIT = /\D/g;

/** The providers raced when the caller names none. */
const DEFAULT_PROVIDERS: CepProvider[] = ["viacep", "brasilapi"];

/** Every provider that can be named, including the deprecated one. */
const KNOWN_PROVIDERS: CepProvider[] = ["viacep", "widenet", "brasilapi"];

/**
 * The status BrasilAPI answers an unknown CEP with, alongside an `errors` body. ViaCEP and
 * Widenet report a miss inside a 200 body instead, so BrasilAPI is the only provider whose
 * not-found signal is an HTTP status.
 *
 * @see Based on: https://brasilapi.com.br/docs#tag/CEP
 */
const BRASIL_API_NOT_FOUND_STATUS = 404;

/** How many times a request is retried, and the base delay between attempts. */
const HTTP_RETRIES = 2;
const HTTP_RETRY_DELAY_MS = 250;

/**
 * Reads the address ViaCEP answers with.
 *
 * @param {string} cep - The 8 digit CEP.
 * @returns {AddressInfo} The address.
 *
 * @see Based on: https://viacep.com.br/
 */
const fetchViaCep = (cep: string): AddressInfo => {
	const response: HttpResponse = httpGet(
		`https://viacep.com.br/ws/${cep}/json/`,
		HTTP_RETRIES,
		HTTP_RETRY_DELAY_MS,
	);

	if (!response.ok) {
		throw new CepProviderFailure("ViaCEP request failed");
	}

	const found = jsonString(response.body, "cep");

	if (jsonTruthy(response.body, "erro") || found === "") {
		throw new GetAddressInfoByCepNotFoundError("CEP não encontrado");
	}

	return {
		cep: found.replaceAll(NON_DIGIT, ""),
		state: jsonString(response.body, "uf"),
		city: jsonString(response.body, "localidade"),
		neighborhood: jsonString(response.body, "bairro"),
		street: jsonString(response.body, "logradouro"),
	};
};

/**
 * Reads the address Widenet answers with.
 *
 * @param {string} cep - The 8 digit CEP.
 * @returns {AddressInfo} The address.
 */
const fetchWidenet = (cep: string): AddressInfo => {
	const response: HttpResponse = httpGet(
		`https://apps.widenet.com.br/busca-cep/api/cep/${cep}.json`,
		HTTP_RETRIES,
		HTTP_RETRY_DELAY_MS,
	);

	if (!response.ok) {
		throw new CepProviderFailure("Widenet request failed");
	}

	const found = jsonString(response.body, "code");

	if (
		jsonInt(response.body, "status") !== 200 ||
		!jsonIsTrue(response.body, "ok") ||
		found === ""
	) {
		throw new GetAddressInfoByCepNotFoundError("CEP não encontrado");
	}

	return {
		cep: found.replaceAll(NON_DIGIT, ""),
		state: jsonString(response.body, "state"),
		city: jsonString(response.body, "city"),
		neighborhood: jsonString(response.body, "district"),
		street: jsonString(response.body, "address"),
	};
};

/**
 * Reads the address BrasilAPI answers with.
 *
 * @param {string} cep - The 8 digit CEP.
 * @returns {AddressInfo} The address.
 *
 * @see Based on: https://brasilapi.com.br/docs#tag/CEP
 */
const fetchBrasilApi = (cep: string): AddressInfo => {
	const response: HttpResponse = httpGet(
		`https://brasilapi.com.br/api/cep/v1/${cep}`,
		HTTP_RETRIES,
		HTTP_RETRY_DELAY_MS,
	);

	if (response.status === BRASIL_API_NOT_FOUND_STATUS) {
		throw new GetAddressInfoByCepNotFoundError("CEP não encontrado");
	}

	if (!response.ok) {
		throw new CepProviderFailure("BrasilAPI request failed");
	}

	const found = jsonString(response.body, "cep");

	if (jsonTruthy(response.body, "errors") || found === "") {
		throw new GetAddressInfoByCepNotFoundError("CEP não encontrado");
	}

	return {
		cep: found.replaceAll(NON_DIGIT, ""),
		state: jsonString(response.body, "state"),
		city: jsonString(response.body, "city"),
		neighborhood: jsonString(response.body, "neighborhood"),
		street: jsonString(response.body, "street"),
	};
};

/**
 * Asks one named provider for a CEP.
 *
 * @param {CepProvider} provider - The provider name.
 * @param {string} cep - The 8 digit CEP.
 * @returns {AddressInfo} The address.
 */
const fetchProvider = (provider: CepProvider, cep: string): AddressInfo => {
	if (provider === "viacep") {
		return fetchViaCep(cep);
	}

	if (provider === "widenet") {
		return fetchWidenet(cep);
	}

	return fetchBrasilApi(cep);
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
export const getAddressInfoByCep = (
	cep: string | number,
	options?: GetAddressInfoByCepOptions,
): AddressInfo => {
	let digits = asString(cep).replaceAll(NON_DIGIT, "");

	if (isNumber(cep)) {
		// `padStart` is a no-op when `digits` is already 8 characters or longer.
		digits = digits.padStart(8, "0");
	}

	if (!CEP_FORMAT.test(digits)) {
		throw new GetAddressInfoByCepValidationError("CEP inválido");
	}

	let chosen: CepProvider[] = DEFAULT_PROVIDERS;

	if (options?.providers !== undefined) {
		// A value that is not a list at all reports the same thing as a list of unknown names,
		// rather than the raw `TypeError` a filter over it would raise.
		if (!isList(options?.providers)) {
			throw new GetAddressInfoByCepValidationError("Nenhum provedor válido especificado");
		}

		chosen = knownProviders(options?.providers);

		if (chosen.length === 0) {
			throw new GetAddressInfoByCepValidationError("Nenhum provedor válido especificado");
		}
	}

	const attempts = startAll(fetchProvider, chosen, digits);
	const found = firstSuccess(attempts);

	if (found !== undefined) {
		return found;
	}

	if (anyFailedWith(attempts, GetAddressInfoByCepNotFoundError)) {
		throw new GetAddressInfoByCepNotFoundError("CEP não encontrado em nenhum serviço");
	}

	throw new GetAddressInfoByCepServiceError(
		"Todos os serviços estão fora de serviço ou indisponíveis",
	);
};
