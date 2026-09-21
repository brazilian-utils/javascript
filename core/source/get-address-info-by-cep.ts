import { jsonStringField } from "./lib/json";
import { keepDigits } from "./lib/digits";

/** Base of every error this utility raises. */
export class GetAddressInfoByCepError extends DomainError {}

/** The value given is not a CEP. */
export class GetAddressInfoByCepValidationError extends GetAddressInfoByCepError {}

/** No CEP service knows this CEP, or none answered. */
export class GetAddressInfoByCepNotFoundError extends GetAddressInfoByCepError {}

/** The address of a CEP. */
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

const CEP_FORMAT = /^[0-9]{8}$/;

const ATTEMPTS = 3;

const RETRY_DELAY_MILLIS = 250;

const TIMEOUT_MILLIS = 10000;

const OK = 200;

const MULTIPLE_CHOICES = 300;

/** One GET, retried the way the published package retries: twice more, 250 ms apart. */
function getWithRetry(url: string): HttpResponse | undefined {
	for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
		if (attempt > 0) {
			clock.sleep(clock.millis(RETRY_DELAY_MILLIS));
		}

		const response = http.request({
			method: "GET",
			url,
			headers: [],
			body: "",
			timeoutMillis: TIMEOUT_MILLIS,
		});

		if (response !== undefined) {
			return response;
		}
	}

	return undefined;
}

/** Whether the status is a 2xx. */
function isOk(status: Int): boolean {
	return status >= OK && status < MULTIPLE_CHOICES;
}

/** ViaCEP answers a JSON object, and marks an unknown CEP with `"erro"`. */
function fetchViaCep(cep: Digits): AddressInfo | undefined {
	const response = getWithRetry(`https://viacep.com.br/ws/${cep}/json/`);

	if (response === undefined || !isOk(response.status)) {
		return undefined;
	}

	const code = jsonStringField(response.body, "cep") ?? "";

	if (code === "") {
		return undefined;
	}

	return {
		cep: keepDigits(code),
		state: jsonStringField(response.body, "uf") ?? "",
		city: jsonStringField(response.body, "localidade") ?? "",
		neighborhood: jsonStringField(response.body, "bairro") ?? "",
		street: jsonStringField(response.body, "logradouro") ?? "",
	};
}

/** BrasilAPI answers 404 for an unknown CEP. */
function fetchBrasilApi(cep: Digits): AddressInfo | undefined {
	const response = getWithRetry(`https://brasilapi.com.br/api/cep/v1/${cep}`);

	if (response === undefined || !isOk(response.status)) {
		return undefined;
	}

	const code = jsonStringField(response.body, "cep") ?? "";

	if (code === "") {
		return undefined;
	}

	return {
		cep: keepDigits(code),
		state: jsonStringField(response.body, "state") ?? "",
		city: jsonStringField(response.body, "city") ?? "",
		neighborhood: jsonStringField(response.body, "neighborhood") ?? "",
		street: jsonStringField(response.body, "street") ?? "",
	};
}

/**
 * The address of a CEP, from the first service that answers.
 *
 * The two services are queried concurrently and the first answer wins; the losing request may
 * still finish, and its answer is dropped, which is why only idempotent GETs belong here. Each
 * request is retried twice, 250 ms apart, exactly as the published package does. Turning a host
 * value into the 8 digits this takes is the DX's job.
 */
export function getAddressInfoByCep(cep: string): AddressInfo {
	if (!CEP_FORMAT.test(cep)) {
		throw new GetAddressInfoByCepValidationError("CEP inválido");
	}

	const address = task.race([(): AddressInfo | undefined => fetchViaCep(cep), (): AddressInfo | undefined => fetchBrasilApi(cep)]);

	if (address === undefined) {
		throw new GetAddressInfoByCepNotFoundError("CEP não encontrado");
	}

	return address;
}
