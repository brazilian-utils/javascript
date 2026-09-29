import { CEP_LENGTH } from "../_internals/constants/cep";
import { CEP_RANGES } from "../_internals/constants/cep-ranges";
import { fetchWithRetry } from "../_internals/fetch-with-retry/fetch-with-retry";
import { findCepRange } from "../_internals/find-cep-range/find-cep-range";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { isValidCep } from "../is-valid-cep/is-valid-cep";
import { parseCep } from "../parse-cep/parse-cep";

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
	/** Which CEP services to race, in the order given (default: `["viacep", "brasilapi"]`). */
	providers?: CepProvider[];
	/** Cancels the lookup: requests in flight are aborted and the promise rejects with `signal.reason`. */
	signal?: AbortSignal;
	/** Time limit in milliseconds for the whole lookup, retries included (default: no limit). */
	timeoutMs?: number;
};

type ProviderPayload = Record<string, unknown>;

/**
 * The status BrasilAPI answers an unknown CEP with, alongside an `errors` body. ViaCEP and
 * Widenet report a miss inside a 200 body instead, so BrasilAPI is the only provider whose
 * not-found signal is an HTTP status and the only one that needs it mapped before `response.ok`
 * turns it into a service failure.
 *
 * BrasilAPI answers the same 404 when the services behind it could not be reached, and rewrites
 * their connection errors into "not found" messages, so the status alone cannot tell a CEP that
 * does not exist from an outage. It is therefore read as `AmbiguousNotFoundError`, which only
 * turns into `GetAddressInfoByCepNotFoundError` when no other provider failed to answer.
 *
 * @see Based on: https://brasilapi.com.br/docs#tag/CEP
 * @see Based on: https://github.com/BrasilAPI/BrasilAPI/blob/main/pages/api/cep/v1/%5Bcep%5D.js
 * Every `service_error` of the services behind it, a connection failure included, is answered
 * with `NotFoundError`, the 404.
 */
const BRASIL_API_NOT_FOUND_STATUS = 404;

/**
 * The lowest CEP the Correios assign: the São Paulo range starts at `01000-000`, and no range
 * covers `00000-000` to `00999-999`. A number cannot carry the leading zero of a São Paulo CEP,
 * so a number is left padded to 8 digits, but one below this is not a CEP with its leading zeros
 * lost: `123` is not the CEP `00000-123`.
 *
 * @see Official: https://buscacepinter.correios.com.br/app/faixa_cep_uf_localidade/index.php
 */
const LOWEST_CEP = 1_000_000;

/** A not-found answer that an outage could also have produced; see `BRASIL_API_NOT_FOUND_STATUS`. */
class AmbiguousNotFoundError extends GetAddressInfoByCepNotFoundError {}

const asString = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * Turns an address a provider answered into `GetAddressInfoByCepNotFoundError` when it contradicts
 * the CEP asked for: its digits, left padded to 8, differ, or its state differs from the one that owns the CEP
 * range (an empty state, and a CEP that no range covers, are not compared).
 *
 * @param {AddressInfo} address - The address a provider answered with.
 * @param {string} cep - The 8 digits of the CEP asked for.
 * @returns {AddressInfo} The same address, when it agrees with the CEP.
 * @throws {GetAddressInfoByCepNotFoundError} When it contradicts the CEP.
 */
const confirmAddress = (address: AddressInfo, cep: string): AddressInfo => {
	const expectedState = findCepRange(cep, CEP_RANGES)?.state;
	const stateDiffers =
		expectedState !== undefined &&
		address.state !== "" &&
		address.state.toUpperCase() !== expectedState;

	if (address.cep.padStart(CEP_LENGTH, "0") !== cep || stateDiffers) {
		// Stryker disable next-line StringLiteral: the message is never observable
		throw new GetAddressInfoByCepNotFoundError("CEP não encontrado");
	}

	return address;
};

const readPayload = async (response: Response): Promise<ProviderPayload> => {
	const data: unknown = await response.json();

	return Object.assign<ProviderPayload, unknown>({}, data);
};

const fetchViaCep = async (cep: string, signal: AbortSignal): Promise<AddressInfo> => {
	const response = await fetchWithRetry(`https://viacep.com.br/ws/${cep}/json/`, { signal });

	if (!response.ok) {
		// Stryker disable next-line StringLiteral: the message is never observable
		throw new Error(`ViaCEP request failed with status ${response.status}`);
	}

	const record = await readPayload(response);
	const cepValue = asString(record["cep"]);

	if (Boolean(record["erro"]) || cepValue === "") {
		// Stryker disable next-line StringLiteral: the message is never observable
		throw new GetAddressInfoByCepNotFoundError("CEP não encontrado");
	}

	return confirmAddress(
		{
			cep: cepValue.replaceAll(/\D/g, ""),
			state: asString(record["uf"]),
			city: asString(record["localidade"]),
			neighborhood: asString(record["bairro"]),
			street: asString(record["logradouro"]),
		},
		cep,
	);
};

const fetchWidenet = async (cep: string, signal: AbortSignal): Promise<AddressInfo> => {
	const response = await fetchWithRetry(
		`https://apps.widenet.com.br/busca-cep/api/cep/${cep}.json`,
		{ signal },
	);

	if (!response.ok) {
		// Stryker disable next-line StringLiteral: the message is never observable
		throw new Error(`Widenet request failed with status ${response.status}`);
	}

	const record = await readPayload(response);
	const codeValue = asString(record["code"]);

	if (record["status"] !== 200 || record["ok"] !== true || codeValue === "") {
		// Stryker disable next-line StringLiteral: the message is never observable
		throw new GetAddressInfoByCepNotFoundError("CEP não encontrado");
	}

	return confirmAddress(
		{
			cep: codeValue.replaceAll(/\D/g, ""),
			state: asString(record["state"]),
			city: asString(record["city"]),
			neighborhood: asString(record["district"]),
			street: asString(record["address"]),
		},
		cep,
	);
};

const fetchBrasilApi = async (cep: string, signal: AbortSignal): Promise<AddressInfo> => {
	const response = await fetchWithRetry(`https://brasilapi.com.br/api/cep/v1/${cep}`, { signal });

	if (response.status === BRASIL_API_NOT_FOUND_STATUS) {
		// Stryker disable next-line StringLiteral: the message is never observable
		throw new AmbiguousNotFoundError("CEP não encontrado");
	}

	if (!response.ok) {
		// Stryker disable next-line StringLiteral: the message is never observable
		throw new Error(`BrasilAPI request failed with status ${response.status}`);
	}

	const record = await readPayload(response);
	const cepValue = asString(record["cep"]);

	if (Boolean(record["errors"]) || cepValue === "") {
		// Stryker disable next-line StringLiteral: the message is never observable
		throw new GetAddressInfoByCepNotFoundError("CEP não encontrado");
	}

	return confirmAddress(
		{
			cep: cepValue.replaceAll(/\D/g, ""),
			state: asString(record["state"]),
			city: asString(record["city"]),
			neighborhood: asString(record["neighborhood"]),
			street: asString(record["street"]),
		},
		cep,
	);
};

const providerMap: Record<CepProvider, (cep: string, signal: AbortSignal) => Promise<AddressInfo>> =
	{
		viacep: fetchViaCep,
		widenet: fetchWidenet,
		brasilapi: fetchBrasilApi,
	};

const DEFAULT_PROVIDERS: readonly CepProvider[] = ["viacep", "brasilapi"];

/**
 * Reads the CEP `getAddressInfoByCep` looks up, as 8 bare digits, under the rules its JSDoc
 * gives: a string has any non-digit characters stripped, as up to 2.4.0, and has to leave the 8
 * digits of a CEP; a number from `LOWEST_CEP` up is left padded to 8 digits.
 *
 * @param {unknown} cep - The CEP given.
 * @returns {string} The 8 digits of the CEP.
 * @throws {GetAddressInfoByCepValidationError} When the value is not a CEP.
 */
const readCep = (cep: unknown): string => {
	if (!isLookupCode(cep) || (typeof cep === "number" && cep < LOWEST_CEP)) {
		throw new GetAddressInfoByCepValidationError("CEP inválido");
	}

	const cepValue =
		typeof cep === "number" ? String(cep).padStart(CEP_LENGTH, "0") : sanitizeToDigits(cep);

	if (!isValidCep(cepValue)) {
		throw new GetAddressInfoByCepValidationError("CEP inválido");
	}

	return parseCep(cepValue);
};

/**
 * Reads `options.providers`, dropping the names of unknown providers.
 *
 * @param {CepProvider[]} [providers] - The `options.providers` given.
 * @returns {CepProvider[]} The providers to race.
 * @throws {GetAddressInfoByCepValidationError} When no known provider is left.
 */
const readProviders = (providers: GetAddressInfoByCepOptions["providers"]): CepProvider[] => {
	if (providers === undefined) return [...DEFAULT_PROVIDERS];

	const known = Array.isArray(providers)
		? providers.filter((provider) => Object.hasOwn(providerMap, provider))
		: [];

	if (known.length === 0) {
		throw new GetAddressInfoByCepValidationError("Nenhum provedor válido especificado");
	}

	return known;
};

/**
 * Reads `options.timeoutMs`.
 *
 * `Number.isFinite` never coerces its argument, so it also turns down a value that is not a
 * number at all, such as `"1000"`.
 *
 * @param {number} [timeoutMs] - The `options.timeoutMs` given.
 * @returns {number|undefined} The time limit, or `undefined` for none.
 * @throws {GetAddressInfoByCepValidationError} When it is given and is not a positive finite number.
 */
const readTimeout = (timeoutMs: number | undefined): number | undefined => {
	if (timeoutMs === undefined) return undefined;

	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
		throw new GetAddressInfoByCepValidationError("Tempo limite inválido");
	}

	return timeoutMs;
};

/**
 * Aborts `controller` with the reason of `signal` when `signal` aborts.
 *
 * @param {AbortSignal} signal - The caller's signal.
 * @param {AbortController} controller - The controller whose signal every request gets.
 * @returns {() => void} Stops forwarding, so a lookup that settled leaves no listener behind.
 */
const forwardAbort = (signal: AbortSignal, controller: AbortController): (() => void) => {
	const abort = (): void => {
		controller.abort(signal.reason);
	};

	signal.addEventListener("abort", abort);

	return () => {
		signal.removeEventListener("abort", abort);
	};
};

/**
 * Races the providers for one CEP and turns their failures into the error `getAddressInfoByCep`
 * rejects with. A reliable "not found" wins over a service failure; BrasilAPI's 404 only wins when
 * no provider failed to answer (see `BRASIL_API_NOT_FOUND_STATUS`).
 *
 * @param {CepProvider[]} providers - The providers to race.
 * @param {string} cep - The 8 digits of the CEP.
 * @param {AbortSignal} signal - Aborts every request.
 * @returns {Promise<AddressInfo>} The first address a provider answers with.
 */
const raceProviders = async (
	providers: CepProvider[],
	cep: string,
	signal: AbortSignal,
): Promise<AddressInfo> => {
	let notFound = false;
	let serviceFailed = false;

	const providerPromises = providers.map(async (provider) => {
		try {
			return await providerMap[provider](cep, signal);
		} catch (error) {
			if (!(error instanceof GetAddressInfoByCepNotFoundError)) serviceFailed = true;
			else if (!(error instanceof AmbiguousNotFoundError)) notFound = true;
			throw error;
		}
	});

	try {
		return await Promise.any(providerPromises);
	} catch {
		if (notFound || !serviceFailed) {
			throw new GetAddressInfoByCepNotFoundError("CEP não encontrado em nenhum serviço");
		}

		throw new GetAddressInfoByCepServiceError(
			"Todos os serviços estão fora de serviço ou indisponíveis",
		);
	}
};

/**
 * Fetches address information for a given CEP using multiple providers simultaneously.
 * Returns the result from the first provider that responds successfully.
 *
 * The providers are started together and raced with `Promise.any`, not tried one after the
 * other, so a provider that is retrying delays nothing for the others: its retries only push
 * back the moment its own failure lands, and therefore the moment an all-failed rejection can
 * surface.
 *
 * A string CEP has any non-digit characters stripped, as up to 2.4.0, so `"CEP 01310-100"` is
 * looked up as `01310-100`, and what is left has to be the 8 digits of a CEP. A number is only read as a CEP when it
 * is a non-negative safe integer: a sign or a decimal point would otherwise be dropped and
 * another CEP looked up, so such a number is rejected before any request is made. A number
 * cannot carry the leading zero of a São Paulo CEP, so it is left padded to 8 digits, but only
 * from `1000000` (`01000-000`, the lowest CEP the Correios assign) up: a smaller number is
 * rejected instead of being looked up as a CEP starting with `00`, as it was up to 2.4.0.
 *
 * An address a provider answers with is only accepted when it agrees with the CEP asked for: its
 * 8 digits must be the CEP, and its state, when it names one, must be the state that owns the CEP
 * range (see `getStateByCep`). Otherwise it counts as that provider not knowing the CEP. Some
 * services answer a CEP no city uses with a made up address: BrasilAPI answered `99999-999`, a
 * Rio Grande do Sul CEP, with a city of Paraná. Up to 2.4.0 such an address was returned.
 *
 * A "not found" answer only wins over a service failure when it is reliable: ViaCEP's and
 * Widenet's are, but BrasilAPI answers 404 both for an unknown CEP and when the services behind
 * it are down. Its 404 is therefore reported as `GetAddressInfoByCepNotFoundError` only when no
 * other provider failed to answer; next to a network failure it is reported as
 * `GetAddressInfoByCepServiceError`. Up to 2.4.0 it always won, so an outage could be reported
 * as an unknown CEP.
 *
 * Once the lookup settles, the requests of the providers that lost the race are aborted, so a
 * slow provider and its retries stop instead of running on in the background.
 *
 * No request has a time limit of its own. Pass `options.timeoutMs` to bound the whole lookup, or
 * `options.signal` to cancel it.
 *
 * The default `providers` are `["viacep", "brasilapi"]`. The deprecated `"widenet"` provider is
 * left out of that list but can still be requested explicitly; it is usually unavailable, since
 * its endpoint now redirects to `ws.apicep.com`, which answered 502 when last checked.
 *
 * @param {string|number} cep - The CEP (Brazilian postal code) to search for. Can be a string or number.
 * @param {GetAddressInfoByCepOptions} options - Optional configuration for the function.
 * @param {CepProvider[]} options.providers - List of providers to use. Defaults to `["viacep", "brasilapi"]`
 * if not specified (the deprecated `"widenet"` provider is excluded from the default list, but can still
 * be requested explicitly; it is usually unavailable, see `GetAddressInfoByCepOptions`).
 * @param {AbortSignal} options.signal - Cancels the lookup, rejecting with `signal.reason`.
 * @param {number} options.timeoutMs - Time limit of the whole lookup, in milliseconds.
 * @returns {Promise<AddressInfo>} A promise that resolves to the address information.
 * @throws {GetAddressInfoByCepValidationError} If the CEP format is invalid, if
 * `options.providers` is given and names no known provider (an empty array, an array of unknown
 * names, and a value that is not an array at all, `null` included, all reject this way rather
 * than with a raw `TypeError`), or if `options.timeoutMs` is given and is not a positive finite
 * number.
 * @throws {GetAddressInfoByCepNotFoundError} If the CEP is not found in any of the services.
 * @throws {GetAddressInfoByCepServiceError} If all services are unavailable, or
 * `options.timeoutMs` ran out first.
 * @throws {unknown} `options.signal.reason`, when the signal aborts the lookup.
 *
 * @example
 * ```typescript
 * // Using the default providers (["viacep", "brasilapi"])
 * const address = await getAddressInfoByCep("01310100");
 *
 * // Using a specific provider, and telling an unknown CEP from a failure
 * try {
 *   await getAddressInfoByCep("01310-100", { providers: ["brasilapi"] });
 * } catch (error) {
 *   if (error instanceof GetAddressInfoByCepNotFoundError) {
 *     // no provider knows the CEP
 *   }
 * }
 *
 * // Using number input
 * const addressFromNumber = await getAddressInfoByCep(1310100);
 *
 * // A negative or fractional number is rejected
 * await getAddressInfoByCep(-1310100); // throws GetAddressInfoByCepValidationError
 *
 * // So is a number below 1000000, which no CEP pads to
 * await getAddressInfoByCep(123); // throws GetAddressInfoByCepValidationError
 *
 * // Giving up after 5 seconds
 * await getAddressInfoByCep("01310100", { timeoutMs: 5000 });
 * ```
 *
 * @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/tudo-sobre-cep
 * @see Based on: https://viacep.com.br/
 * ViaCEP, one of the two default providers. A third-party service, not a Correios one.
 * @see Based on: https://apps.widenet.com.br/busca-cep/api/cep/01310100.json
 * Widenet, the deprecated provider. The endpoint redirects to `ws.apicep.com`, which answered 502 when last checked.
 * @see Based on: https://brasilapi.com.br/docs#tag/CEP
 * BrasilAPI, the other default provider. A third-party service, not a Correios one.
 */
export const getAddressInfoByCep = async (
	cep: string | number,
	options?: GetAddressInfoByCepOptions,
): Promise<AddressInfo> => {
	const cepString = readCep(cep);
	const providersToUse = readProviders(options?.providers);
	const timeoutMs = readTimeout(options?.timeoutMs);
	const signal = options?.signal;

	signal?.throwIfAborted();

	const controller = new AbortController();
	const stopForwarding = signal === undefined ? undefined : forwardAbort(signal, controller);
	const timer =
		timeoutMs === undefined
			? undefined
			: setTimeout(() => {
					controller.abort();
				}, timeoutMs);

	try {
		return await raceProviders(providersToUse, cepString, controller.signal);
	} catch (error) {
		signal?.throwIfAborted();

		throw error;
	} finally {
		clearTimeout(timer);
		stopForwarding?.();
		controller.abort();
	}
};
