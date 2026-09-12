import { fetchWithRetry } from "../_internals/fetch-with-retry/fetch-with-retry";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { isValidCep } from "../is-valid-cep/is-valid-cep";

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
	/** Which CEP services to race, in the order given (default: all of them). */
	providers?: CepProvider[];
};

type ProviderPayload = Record<string, unknown>;

const asString = (value: unknown): string => (typeof value === "string" ? value : "");

const readPayload = async (response: Response): Promise<ProviderPayload> => {
	const data: unknown = await response.json();

	return Object.assign<ProviderPayload, unknown>({}, data);
};

const fetchViaCep = async (cep: string): Promise<AddressInfo> => {
	const response = await fetchWithRetry(`https://viacep.com.br/ws/${cep}/json/`);

	if (!response.ok) {
		// Stryker disable next-line StringLiteral: only `instanceof GetAddressInfoByCepNotFoundError`
		// is checked when aggregating provider failures below, so this message is never observable.
		throw new Error(`ViaCEP request failed with status ${response.status}`);
	}

	const record = await readPayload(response);
	const cepValue = asString(record["cep"]);

	if (Boolean(record["erro"]) || cepValue === "") {
		// Stryker disable next-line StringLiteral: only `instanceof GetAddressInfoByCepNotFoundError`
		// is checked when aggregating provider failures below, so this message is never observable.
		throw new GetAddressInfoByCepNotFoundError("CEP não encontrado");
	}

	return {
		cep: cepValue.replaceAll(/\D/g, ""),
		state: asString(record["uf"]),
		city: asString(record["localidade"]),
		neighborhood: asString(record["bairro"]),
		street: asString(record["logradouro"]),
	};
};

const fetchWidenet = async (cep: string): Promise<AddressInfo> => {
	const response = await fetchWithRetry(
		`https://apps.widenet.com.br/busca-cep/api/cep/${cep}.json`,
	);

	if (!response.ok) {
		// Stryker disable next-line StringLiteral: only `instanceof GetAddressInfoByCepNotFoundError`
		// is checked when aggregating provider failures below, so this message is never observable.
		throw new Error(`Widenet request failed with status ${response.status}`);
	}

	const record = await readPayload(response);
	const codeValue = asString(record["code"]);

	if (record["status"] !== 200 || record["ok"] !== true || codeValue === "") {
		// Stryker disable next-line StringLiteral: only `instanceof GetAddressInfoByCepNotFoundError`
		// is checked when aggregating provider failures below, so this message is never observable.
		throw new GetAddressInfoByCepNotFoundError("CEP não encontrado");
	}

	return {
		cep: codeValue.replaceAll(/\D/g, ""),
		state: asString(record["state"]),
		city: asString(record["city"]),
		neighborhood: asString(record["district"]),
		street: asString(record["address"]),
	};
};

const fetchBrasilApi = async (cep: string): Promise<AddressInfo> => {
	const response = await fetchWithRetry(`https://brasilapi.com.br/api/cep/v1/${cep}`);

	if (!response.ok) {
		// Stryker disable next-line StringLiteral: only `instanceof GetAddressInfoByCepNotFoundError`
		// is checked when aggregating provider failures below, so this message is never observable.
		throw new Error(`BrasilAPI request failed with status ${response.status}`);
	}

	const record = await readPayload(response);
	const cepValue = asString(record["cep"]);

	if (Boolean(record["errors"]) || cepValue === "") {
		// Stryker disable next-line StringLiteral: only `instanceof GetAddressInfoByCepNotFoundError`
		// is checked when aggregating provider failures below, so this message is never observable.
		throw new GetAddressInfoByCepNotFoundError("CEP não encontrado");
	}

	return {
		cep: cepValue.replaceAll(/\D/g, ""),
		state: asString(record["state"]),
		city: asString(record["city"]),
		neighborhood: asString(record["neighborhood"]),
		street: asString(record["street"]),
	};
};

const providerMap: Record<CepProvider, (cep: string) => Promise<AddressInfo>> = {
	viacep: fetchViaCep,
	widenet: fetchWidenet,
	brasilapi: fetchBrasilApi,
};

/**
 * Fetches address information for a given CEP using multiple providers simultaneously.
 * Returns the result from the first provider that responds successfully.
 *
 * @param {string|number} cep - The CEP (Brazilian postal code) to search for. Can be a string or number.
 * @param {GetAddressInfoByCepOptions} options - Optional configuration for the function.
 * @param {CepProvider[]} options.providers - List of providers to use. Defaults to `["viacep", "brasilapi"]`
 * if not specified (the deprecated `"widenet"` provider is excluded from the default list, but can still
 * be requested explicitly).
 * @returns {Promise<AddressInfo>} A promise that resolves to the address information.
 * @throws {GetAddressInfoByCepValidationError} If the CEP format is invalid.
 * @throws {GetAddressInfoByCepNotFoundError} If the CEP is not found in any of the services.
 * @throws {GetAddressInfoByCepServiceError} If all services are unavailable.
 *
 * @example
 * ```typescript
 * // Using all providers (default)
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
 * @see Based on: https://viacep.com.br/ Default `"viacep"` provider.
 * @see Based on: https://brasilapi.com.br/docs#tag/CEP Default `"brasilapi"` provider.
 */
export const getAddressInfoByCep = async (
	cep: string | number,
	options?: GetAddressInfoByCepOptions,
): Promise<AddressInfo> => {
	let cepString = sanitizeToDigits(cep);

	if (typeof cep === "number") {
		// `padStart` is a no-op when `cepString` is already 8 characters or longer, so there is no
		// need to check its length here first.
		cepString = cepString.padStart(8, "0");
	}

	if (!isValidCep(cepString)) {
		throw new GetAddressInfoByCepValidationError("CEP inválido");
	}

	let providersToUse: CepProvider[];
	if (options?.providers === undefined) {
		providersToUse = ["viacep", "brasilapi"] as CepProvider[];
	} else {
		// An empty `options.providers` array also filters down to an empty `providersToUse` below,
		// which already reports the same validation error, so there is no dedicated check for it here.
		providersToUse = options.providers.filter((p) => Object.hasOwn(providerMap, p));
		if (providersToUse.length === 0) {
			throw new GetAddressInfoByCepValidationError("Nenhum provedor válido especificado");
		}
	}

	let notFound = false;
	const providerPromises = providersToUse.map((provider) =>
		providerMap[provider](cepString).catch((error: unknown) => {
			if (error instanceof GetAddressInfoByCepNotFoundError) notFound = true;
			throw error;
		}),
	);

	try {
		return await Promise.any(providerPromises);
	} catch {
		if (notFound) {
			throw new GetAddressInfoByCepNotFoundError("CEP não encontrado em nenhum serviço");
		}

		throw new GetAddressInfoByCepServiceError(
			"Todos os serviços estão fora de serviço ou indisponíveis",
		);
	}
};
