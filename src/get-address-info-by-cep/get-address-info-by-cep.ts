import { fetchWithRetry } from "../_internals/fetch-with-retry/fetch-with-retry";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { isValidCep } from "../is-valid-cep/is-valid-cep";

export class GetAddressInfoByCepError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GetAddressInfoByCepError";
	}
}

export class GetAddressInfoByCepValidationError extends GetAddressInfoByCepError {
	constructor(message: string) {
		super(message);
		this.name = "GetAddressInfoByCepValidationError";
	}
}

export class GetAddressInfoByCepNotFoundError extends GetAddressInfoByCepError {
	constructor(message: string) {
		super(message);
		this.name = "GetAddressInfoByCepNotFoundError";
	}
}

export class GetAddressInfoByCepServiceError extends GetAddressInfoByCepError {
	constructor(message: string) {
		super(message);
		this.name = "GetAddressInfoByCepServiceError";
	}
}

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

export type CepProvider = "viacep" | "widenet" | "brasilapi";

export type GetAddressInfoByCepOptions = {
	/** Which CEP services to race, in the order given (default: all of them). */
	providers?: CepProvider[];
};

type ViaCepResponse = {
	cep?: string;
	logradouro?: string;
	complemento?: string;
	bairro?: string;
	localidade?: string;
	uf?: string;
	erro?: boolean;
};

type WidenetResponse = {
	code?: string;
	status?: number;
	ok?: boolean;
	state?: string;
	city?: string;
	district?: string;
	address?: string;
	message?: string;
};

type BrasilApiResponse = {
	cep?: string;
	state?: string;
	city?: string;
	neighborhood?: string;
	street?: string;
	errors?: Array<{ message: string }>;
};

const fetchViaCep = async (cep: string): Promise<AddressInfo> => {
	const response = await fetchWithRetry(`https://viacep.com.br/ws/${cep}/json/`);

	if (!response.ok) {
		// Stryker disable next-line StringLiteral: only `instanceof GetAddressInfoByCepNotFoundError`
		// is checked when aggregating provider failures below, so this message is never observable.
		throw new Error(`ViaCEP request failed with status ${response.status}`);
	}

	const data: ViaCepResponse = await response.json();

	if (data.erro || !data.cep) {
		// Stryker disable next-line StringLiteral: only `instanceof GetAddressInfoByCepNotFoundError`
		// is checked when aggregating provider failures below, so this message is never observable.
		throw new GetAddressInfoByCepNotFoundError("CEP não encontrado");
	}

	return {
		cep: data.cep.replace(/\D/g, ""),
		state: data.uf || "",
		city: data.localidade || "",
		neighborhood: data.bairro || "",
		street: data.logradouro || "",
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

	const data: WidenetResponse = await response.json();

	if (data.status !== 200 || !data.ok || !data.code) {
		// Stryker disable next-line StringLiteral: only `instanceof GetAddressInfoByCepNotFoundError`
		// is checked when aggregating provider failures below, so this message is never observable.
		throw new GetAddressInfoByCepNotFoundError("CEP não encontrado");
	}

	return {
		cep: data.code.replace(/\D/g, ""),
		state: data.state || "",
		city: data.city || "",
		neighborhood: data.district || "",
		street: data.address || "",
	};
};

const fetchBrasilApi = async (cep: string): Promise<AddressInfo> => {
	const response = await fetchWithRetry(`https://brasilapi.com.br/api/cep/v1/${cep}`);

	if (!response.ok) {
		// Stryker disable next-line StringLiteral: only `instanceof GetAddressInfoByCepNotFoundError`
		// is checked when aggregating provider failures below, so this message is never observable.
		throw new Error(`BrasilAPI request failed with status ${response.status}`);
	}

	const data: BrasilApiResponse = await response.json();

	if (data.errors || !data.cep) {
		// Stryker disable next-line StringLiteral: only `instanceof GetAddressInfoByCepNotFoundError`
		// is checked when aggregating provider failures below, so this message is never observable.
		throw new GetAddressInfoByCepNotFoundError("CEP não encontrado");
	}

	return {
		cep: data.cep.replace(/\D/g, ""),
		state: data.state || "",
		city: data.city || "",
		neighborhood: data.neighborhood || "",
		street: data.street || "",
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
	if (options?.providers !== undefined) {
		// An empty `options.providers` array also filters down to an empty `providersToUse` below,
		// which already reports the same validation error, so there is no dedicated check for it here.
		providersToUse = options.providers.filter((p) => Object.hasOwn(providerMap, p));
		if (providersToUse.length === 0) {
			throw new GetAddressInfoByCepValidationError("Nenhum provedor válido especificado");
		}
	} else {
		providersToUse = ["viacep", "brasilapi"] as CepProvider[];
	}

	const providerPromises = providersToUse.map((provider) =>
		providerMap[provider](cepString).catch((error) => {
			return Promise.reject({ provider, error });
		}),
	);

	try {
		return await Promise.any(providerPromises);
	} catch {
		const results = await Promise.allSettled(providerPromises);

		// Stryker disable next-line ConditionalExpression,MethodExpression: this line is only
		// reached after `Promise.any` above has rejected, which by its contract only happens once
		// every input promise has already rejected, so every result here is already "rejected"; the
		// filter exists to narrow the element type from `PromiseSettledResult` to
		// `PromiseRejectedResult` for the checks below, not to exclude anything at runtime.
		const rejections = results.filter((result) => result.status === "rejected");

		const networkErrors = rejections.filter(
			(rejection) => !(rejection.reason.error instanceof GetAddressInfoByCepNotFoundError),
		);

		if (networkErrors.length === rejections.length) {
			throw new GetAddressInfoByCepServiceError(
				"Todos os serviços estão fora de serviço ou indisponíveis",
			);
		}

		throw new GetAddressInfoByCepNotFoundError("CEP não encontrado em nenhum serviço");
	}
};
