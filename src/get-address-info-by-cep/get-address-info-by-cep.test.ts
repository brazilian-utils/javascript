import {
	afterEach,
	beforeEach,
	describe,
	expect,
	expectTypeOf,
	it,
	vi,
} from "../_internals/test/runtime";
import {
	type AddressInfo,
	type CepProvider,
	type GetAddressInfoByCepOptions,
	GetAddressInfoByCepError,
	GetAddressInfoByCepNotFoundError,
	GetAddressInfoByCepServiceError,
	GetAddressInfoByCepValidationError,
	getAddressInfoByCep,
} from "./get-address-info-by-cep";

type FetchInput = string | URL | Request;

const requestUrl = (input: FetchInput): string => {
	if (typeof input === "string") return input;
	return input instanceof URL ? input.href : input.url;
};

type MockResponse = {
	ok: boolean;
	status?: number;
	json: () => Promise<unknown>;
};

const VALID_CEP = "01310100";
const VALID_CEP_MASKED = "01310-100";
const LIVE_TEST_TIMEOUT = 15_000;

const viacepPayload = {
	bairro: "Bela Vista",
	cep: "01310-100",
	localidade: "São Paulo",
	logradouro: "Avenida Paulista",
	uf: "SP",
};

const widenetPayload = {
	address: "Avenida Paulista",
	city: "São Paulo",
	code: "01310-100",
	district: "Bela Vista",
	ok: true,
	state: "SP",
	status: 200,
};

const brasilApiPayload = {
	cep: VALID_CEP,
	city: "São Paulo",
	neighborhood: "Bela Vista",
	state: "SP",
	street: "Avenida Paulista",
};

function createJsonResponse(payload: unknown, status = 200): MockResponse {
	return {
		json: () => Promise.resolve(payload),
		ok: status >= 200 && status < 300,
		status,
	};
}

function setupFetchMock(
	fetchMock: ReturnType<typeof vi.fn>,
	overrides?: Partial<Record<"brasilapi" | "viacep" | "widenet", Error | MockResponse>>,
) {
	fetchMock.mockImplementation((input: FetchInput) => {
		const url = requestUrl(input);

		if (url.includes("viacep.com.br")) {
			if (overrides?.viacep instanceof Error) {
				throw overrides.viacep;
			}

			return overrides?.viacep ?? createJsonResponse(viacepPayload);
		}

		if (url.includes("apps.widenet.com.br")) {
			if (overrides?.widenet instanceof Error) {
				throw overrides.widenet;
			}

			return overrides?.widenet ?? createJsonResponse(widenetPayload);
		}

		if (url.includes("brasilapi.com.br")) {
			if (overrides?.brasilapi instanceof Error) {
				throw overrides.brasilapi;
			}

			return overrides?.brasilapi ?? createJsonResponse(brasilApiPayload);
		}

		throw new Error(`Unexpected URL: ${url}`);
	});
}

function expectDefaultAddress(result: AddressInfo) {
	expect(result).toBeDefined();
	expect(result.cep).toBe(VALID_CEP);
	expect(result.state).toBe("SP");
	expect(result.city).toBe("São Paulo");
}

function expectNormalizedAddress(result: AddressInfo) {
	expectDefaultAddress(result);
	expect(result).toHaveProperty("cep");
	expect(result).toHaveProperty("state");
	expect(result).toHaveProperty("city");
	expect(result).toHaveProperty("neighborhood");
	expect(result).toHaveProperty("street");
	expect(result.neighborhood).toBe("Bela Vista");
	expect(result.street).toBe("Avenida Paulista");
}

function expectAddressFound(result: AddressInfo) {
	expectDefaultAddress(result);
	expect(result.neighborhood).toBeTruthy();
	expect(result.street).toBeTruthy();
}

function expectEmptyAddressFields(result: AddressInfo) {
	expect(result.neighborhood).toBe("");
	expect(result.city).toBe("");
	expect(result.street).toBe("");
	expect(result.state).toBe("");
}

const globalWithLiveFlag = globalThis as typeof globalThis & {
	RUN_LIVE_CEP_TESTS?: string | number;
};

function shouldRunLiveCepTests() {
	if (
		globalWithLiveFlag.RUN_LIVE_CEP_TESTS === "1" ||
		globalWithLiveFlag.RUN_LIVE_CEP_TESTS === 1
	) {
		return true;
	}

	try {
		if (typeof Deno !== "undefined") {
			return Deno.env.get("RUN_LIVE_CEP_TESTS") === "1";
		}
	} catch {
		return false;
	}

	try {
		const maybeProcess = (
			globalThis as typeof globalThis & {
				process?: {
					env?: Record<string, string | undefined>;
				};
			}
		).process;

		if (maybeProcess?.env?.["RUN_LIVE_CEP_TESTS"] === "1") {
			return true;
		}
	} catch {
		return false;
	}

	return false;
}

const RUN_LIVE_CEP_TESTS = shouldRunLiveCepTests();

describe("getAddressInfoByCep", () => {
	describe("error class names", () => {
		it("should set name to GetAddressInfoByCepError", () => {
			expect(new GetAddressInfoByCepError("message").name).toBe("GetAddressInfoByCepError");
		});

		it("should set name to GetAddressInfoByCepValidationError", () => {
			const error = new GetAddressInfoByCepValidationError("message");

			expect(error.name).toBe("GetAddressInfoByCepValidationError");
		});

		it("should set name to GetAddressInfoByCepNotFoundError", () => {
			const error = new GetAddressInfoByCepNotFoundError("message");

			expect(error.name).toBe("GetAddressInfoByCepNotFoundError");
		});

		it("should set name to GetAddressInfoByCepServiceError", () => {
			const error = new GetAddressInfoByCepServiceError("message");

			expect(error.name).toBe("GetAddressInfoByCepServiceError");
		});
	});

	describe("deterministic behavior", () => {
		const fetchMock = vi.fn();
		const originalFetch = globalThis.fetch;

		beforeEach(() => {
			globalThis.fetch = fetchMock as typeof fetch;
			fetchMock.mockClear();
			setupFetchMock(fetchMock);
		});

		afterEach(() => {
			globalThis.fetch = originalFetch;
			vi.restoreAllMocks();
		});

		describe("cancellation", () => {
			const hangUntilAborted = (): void => {
				fetchMock.mockImplementation(
					(_input: FetchInput, init?: RequestInit) =>
						new Promise((_resolve, reject) => {
							init?.signal?.addEventListener("abort", () => {
								reject(new Error("aborted", { cause: init.signal?.reason }));
							});
						}),
				);
			};

			const requestSignal = (index: number): AbortSignal | null | undefined =>
				(fetchMock.mock.calls[index]?.[1] as RequestInit | undefined)?.signal;

			it("should hand every request of every provider a signal", async () => {
				await getAddressInfoByCep(VALID_CEP, { providers: ["viacep", "widenet", "brasilapi"] });

				expect(fetchMock).toHaveBeenCalledTimes(3);
				expect(requestSignal(0)).toBeInstanceOf(AbortSignal);
				expect(requestSignal(1)).toBeInstanceOf(AbortSignal);
				expect(requestSignal(2)).toBeInstanceOf(AbortSignal);
			});

			it("should reject with GetAddressInfoByCepServiceError once timeoutMs runs out", async () => {
				hangUntilAborted();

				await expect(getAddressInfoByCep(VALID_CEP, { timeoutMs: 10 })).rejects.toThrow(
					GetAddressInfoByCepServiceError,
				);
			});

			it("should reject with the reason of options.signal when it aborts", async () => {
				hangUntilAborted();
				const controller = new AbortController();
				const reason = new Error("cancelled by the caller");
				const lookup = getAddressInfoByCep(VALID_CEP, { signal: controller.signal });

				controller.abort(reason);

				await expect(lookup).rejects.toThrow(reason);
			});

			it("should reject with the reason of an already aborted signal, without a request", async () => {
				const reason = new Error("cancelled before the lookup");

				await expect(
					getAddressInfoByCep(VALID_CEP, { signal: AbortSignal.abort(reason) }),
				).rejects.toThrow(reason);
				expect(fetchMock).not.toHaveBeenCalled();
			});

			it("should resolve as before when the signal never aborts and the time limit is not reached", async () => {
				const controller = new AbortController();
				const result = await getAddressInfoByCep(VALID_CEP, {
					signal: controller.signal,
					timeoutMs: 60_000,
				});

				expectDefaultAddress(result);
			});

			it("should stop listening to options.signal once the lookup settles", async () => {
				const controller = new AbortController();
				const removed: string[] = [];
				const removeEventListener = controller.signal.removeEventListener.bind(controller.signal);

				controller.signal.removeEventListener = (type: string, ...rest: unknown[]): void => {
					removed.push(type);
					Reflect.apply(removeEventListener, undefined, [type, ...rest]);
				};

				await getAddressInfoByCep(VALID_CEP, {
					providers: ["viacep"],
					signal: controller.signal,
				});
				controller.abort(new Error("cancelled after the lookup"));

				expect(removed).toEqual(["abort"]);
			});

			it("should clear the time limit once the lookup settles", async () => {
				const originalClearTimeout = globalThis.clearTimeout;
				let cleared = 0;

				globalThis.clearTimeout = (timer?: Parameters<typeof clearTimeout>[0]): void => {
					cleared++;
					originalClearTimeout(timer);
				};

				try {
					await getAddressInfoByCep(VALID_CEP, { providers: ["viacep"], timeoutMs: 60_000 });
				} finally {
					globalThis.clearTimeout = originalClearTimeout;
				}

				expect(cleared).toBe(1);
			});

			it("should abort the requests of the providers that lost the race once it settles", async () => {
				fetchMock.mockImplementation((input: FetchInput, init?: RequestInit) => {
					if (requestUrl(input).includes("viacep.com.br")) {
						return createJsonResponse(viacepPayload);
					}

					return new Promise((_resolve, reject) => {
						init?.signal?.addEventListener("abort", () => {
							reject(new Error("aborted"));
						});
					});
				});

				const result = await getAddressInfoByCep(VALID_CEP);

				expectDefaultAddress(result);
				expect(requestSignal(0)?.aborted).toBe(true);
				expect(requestSignal(1)?.aborted).toBe(true);
			});

			it("should abort the requests once the lookup rejects too", async () => {
				setupFetchMock(fetchMock, {
					viacep: createJsonResponse({ erro: true }),
					brasilapi: createJsonResponse({}, 500),
				});

				await expect(getAddressInfoByCep(VALID_CEP)).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
				expect(requestSignal(0)?.aborted).toBe(true);
			});

			it("should set no time limit without timeoutMs", async () => {
				fetchMock.mockImplementation(
					(_input: FetchInput, init?: RequestInit) =>
						new Promise((resolve, reject) => {
							const timer = setTimeout(() => {
								resolve(createJsonResponse(viacepPayload));
							}, 20);

							init?.signal?.addEventListener("abort", () => {
								clearTimeout(timer);
								reject(new Error("aborted", { cause: init.signal?.reason }));
							});
						}),
				);

				expectDefaultAddress(await getAddressInfoByCep(VALID_CEP, { providers: ["viacep"] }));
			});
		});

		describe("validation", () => {
			it("should throw GetAddressInfoByCepValidationError for invalid CEP format", async () => {
				await expect(getAddressInfoByCep("12345")).rejects.toThrow(
					GetAddressInfoByCepValidationError,
				);
				await expect(getAddressInfoByCep("123456789")).rejects.toThrow(
					GetAddressInfoByCepValidationError,
				);
				await expect(getAddressInfoByCep("")).rejects.toThrow(GetAddressInfoByCepValidationError);
			});

			it("should throw GetAddressInfoByCepValidationError for empty providers array", async () => {
				await expect(getAddressInfoByCep(VALID_CEP, { providers: [] })).rejects.toThrow(
					GetAddressInfoByCepValidationError,
				);
			});

			it("should include the Portuguese message for an invalid CEP", async () => {
				await expect(getAddressInfoByCep("12345")).rejects.toThrow("CEP inválido");
			});

			it("should not pad a short string CEP with leading zeros (only numbers get padded)", async () => {
				await expect(getAddressInfoByCep("1310100")).rejects.toThrow(
					GetAddressInfoByCepValidationError,
				);
			});

			it("should accept valid CEP as string", async () => {
				const result = await getAddressInfoByCep(VALID_CEP);

				expectDefaultAddress(result);
			});

			it("should accept valid CEP as number and pad with leading zeros", async () => {
				const result = await getAddressInfoByCep(1_310_100);

				expectDefaultAddress(result);
			});

			it("should throw GetAddressInfoByCepValidationError for a negative or fractional number, without a request", async () => {
				await expect(getAddressInfoByCep(-1_310_100)).rejects.toThrow(
					GetAddressInfoByCepValidationError,
				);
				await expect(getAddressInfoByCep(131_010.1)).rejects.toThrow(
					GetAddressInfoByCepValidationError,
				);
				expect(fetchMock).not.toHaveBeenCalled();
			});

			it("should accept CEP with mask", async () => {
				const result = await getAddressInfoByCep(VALID_CEP_MASKED);

				expect(result).toBeDefined();
				expect(result.cep).toBe(VALID_CEP);
			});

			it("should strip any non-digit character of a string CEP, as up to 2.4.0", async () => {
				expectDefaultAddress(await getAddressInfoByCep("CEP 01310-100"));
				expectDefaultAddress(await getAddressInfoByCep("01310/100"));
			});

			it("should reject a string whose digits are not the 8 of a CEP, without a request", async () => {
				await expect(getAddressInfoByCep("CEP 0131-100")).rejects.toThrow(
					GetAddressInfoByCepValidationError,
				);
				await expect(getAddressInfoByCep("CEP")).rejects.toThrow(
					GetAddressInfoByCepValidationError,
				);
				expect(fetchMock).not.toHaveBeenCalled();
			});

			it("should accept a CEP masked with dots and whitespace, the separators isValidCep accepts", async () => {
				const result = await getAddressInfoByCep(" 01.310-100 ");

				expect(result.cep).toBe(VALID_CEP);
				expect(requestUrl(fetchMock.mock.calls[0]?.[0] as FetchInput)).toContain(VALID_CEP);
			});

			it("should reject a number below 1000000, which no CEP pads to, without a request", async () => {
				await expect(getAddressInfoByCep(123)).rejects.toThrow(GetAddressInfoByCepValidationError);
				await expect(getAddressInfoByCep(123)).rejects.toThrow("CEP inválido");
				await expect(getAddressInfoByCep(999_999)).rejects.toThrow(
					GetAddressInfoByCepValidationError,
				);
				await expect(getAddressInfoByCep(0)).rejects.toThrow(GetAddressInfoByCepValidationError);
				expect(fetchMock).not.toHaveBeenCalled();
			});

			it("should pad 1000000, the lowest CEP the Correios assign, to 01000-000", async () => {
				setupFetchMock(fetchMock, {
					viacep: createJsonResponse({ ...viacepPayload, cep: "01000-000" }),
				});

				await getAddressInfoByCep(1_000_000, { providers: ["viacep"] });

				expect(requestUrl(fetchMock.mock.calls[0]?.[0] as FetchInput)).toBe(
					"https://viacep.com.br/ws/01000000/json/",
				);
			});

			it("should reject a number past 8 digits", async () => {
				await expect(getAddressInfoByCep(100_000_000)).rejects.toThrow(
					GetAddressInfoByCepValidationError,
				);
			});

			it("should reject a timeoutMs that is not a positive finite number, without a request", async () => {
				await Promise.all(
					[0, -1, Number.NaN, Number.POSITIVE_INFINITY, "1000"].map((timeoutMs) =>
						expect(
							// @ts-expect-error: intentionally invalid input
							getAddressInfoByCep(VALID_CEP, { timeoutMs }),
						).rejects.toThrow("Tempo limite inválido"),
					),
				);
				expect(fetchMock).not.toHaveBeenCalled();
			});
		});

		describe("provider selection", () => {
			it("should use the default providers (viacep, brasilapi) and skip the deprecated widenet provider", async () => {
				const result = await getAddressInfoByCep(VALID_CEP);

				expectDefaultAddress(result);

				const requestedUrls = fetchMock.mock.calls.map(([input]: [FetchInput]) =>
					requestUrl(input),
				);
				expect(requestedUrls.some((url: string) => url.includes("viacep.com.br"))).toBe(true);
				expect(requestedUrls.some((url: string) => url.includes("brasilapi.com.br"))).toBe(true);
				expect(requestedUrls.some((url: string) => url.includes("widenet"))).toBe(false);
			});

			it("should still allow widenet to be used when explicitly requested", async () => {
				const result = await getAddressInfoByCep(VALID_CEP, {
					providers: ["widenet"],
				});

				expect(result).toBeDefined();
				expect(result.cep).toBe(VALID_CEP);
			});

			it("should throw GetAddressInfoByCepValidationError for a providers array made only of inherited Object property names", async () => {
				await expect(
					getAddressInfoByCep(VALID_CEP, {
						// @ts-expect-error: intentionally invalid input
						providers: ["constructor", "toString"],
					}),
				).rejects.toThrow(GetAddressInfoByCepValidationError);
			});

			it("should include the Portuguese message when providers filter down to none", async () => {
				await expect(
					getAddressInfoByCep(VALID_CEP, {
						// @ts-expect-error: intentionally invalid input
						providers: ["invalid"],
					}),
				).rejects.toThrow("Nenhum provedor válido especificado");
			});

			it("should throw GetAddressInfoByCepValidationError for a providers value that is not an array, null included", async () => {
				await Promise.all(
					[null, "viacep", 5, {}, true].map((providers) =>
						expect(
							// @ts-expect-error: intentionally invalid input
							getAddressInfoByCep(VALID_CEP, { providers }),
						).rejects.toThrow(GetAddressInfoByCepValidationError),
					),
				);
			});

			it("should include the Portuguese message for a providers value that is not an array", async () => {
				await expect(
					// @ts-expect-error: intentionally invalid input
					getAddressInfoByCep(VALID_CEP, { providers: null }),
				).rejects.toThrow("Nenhum provedor válido especificado");
			});

			it("should use only specified providers", async () => {
				const result = await getAddressInfoByCep(VALID_CEP, {
					providers: ["brasilapi"],
				});

				expectDefaultAddress(result);
			});

			it("should use multiple specified providers", async () => {
				const result = await getAddressInfoByCep(VALID_CEP, {
					providers: ["viacep", "brasilapi"],
				});

				expectDefaultAddress(result);
			});

			it("should filter out invalid provider names", async () => {
				const result = await getAddressInfoByCep(VALID_CEP, {
					// @ts-expect-error: intentionally invalid input
					providers: ["viacep", "invalid", "brasilapi"],
				});

				expect(result).toBeDefined();
				expect(result.cep).toBe(VALID_CEP);
			});
		});

		describe("response structure", () => {
			it("should return normalized address information from ViaCEP", async () => {
				const result = await getAddressInfoByCep(VALID_CEP, {
					providers: ["viacep"],
				});

				expectNormalizedAddress(result);
			});

			it("should return normalized address information from Widenet", async () => {
				const result = await getAddressInfoByCep(VALID_CEP, {
					providers: ["widenet"],
				});

				expectNormalizedAddress(result);
			});

			it("should return normalized address information from BrasilAPI", async () => {
				const result = await getAddressInfoByCep(VALID_CEP, {
					providers: ["brasilapi"],
				});

				expectNormalizedAddress(result);
			});
		});

		describe("error handling", () => {
			it("should throw GetAddressInfoByCepNotFoundError when ViaCEP returns erro", async () => {
				setupFetchMock(fetchMock, {
					viacep: createJsonResponse({
						erro: true,
					}),
				});

				await expect(getAddressInfoByCep("00000000", { providers: ["viacep"] })).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should throw GetAddressInfoByCepNotFoundError when ViaCEP returns erro even if cep is present", async () => {
				setupFetchMock(fetchMock, {
					viacep: createJsonResponse({ cep: "01310-100", erro: true }),
				});

				await expect(getAddressInfoByCep(VALID_CEP, { providers: ["viacep"] })).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should throw GetAddressInfoByCepNotFoundError when Widenet returns invalid status", async () => {
				setupFetchMock(fetchMock, {
					widenet: createJsonResponse({
						ok: false,
						status: 404,
					}),
				});

				await expect(getAddressInfoByCep("00000000", { providers: ["widenet"] })).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should throw GetAddressInfoByCepNotFoundError when Widenet's code is missing", async () => {
				setupFetchMock(fetchMock, {
					widenet: createJsonResponse({ ok: true, status: 200 }),
				});

				await expect(getAddressInfoByCep(VALID_CEP, { providers: ["widenet"] })).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should throw GetAddressInfoByCepNotFoundError when Widenet's ok flag is false even with a code", async () => {
				setupFetchMock(fetchMock, {
					widenet: createJsonResponse({ code: "01310-100", ok: false, status: 200 }),
				});

				await expect(getAddressInfoByCep(VALID_CEP, { providers: ["widenet"] })).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should throw GetAddressInfoByCepNotFoundError when Widenet's status is not 200 even with ok and a code", async () => {
				setupFetchMock(fetchMock, {
					widenet: createJsonResponse({ code: "01310-100", ok: true, status: 404 }),
				});

				await expect(getAddressInfoByCep(VALID_CEP, { providers: ["widenet"] })).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should throw GetAddressInfoByCepServiceError when Widenet's HTTP request itself fails", async () => {
				setupFetchMock(fetchMock, {
					widenet: createJsonResponse({}, 503),
				});

				await expect(getAddressInfoByCep(VALID_CEP, { providers: ["widenet"] })).rejects.toThrow(
					GetAddressInfoByCepServiceError,
				);
			});

			it("should throw GetAddressInfoByCepNotFoundError when BrasilAPI returns errors", async () => {
				setupFetchMock(fetchMock, {
					brasilapi: createJsonResponse({
						errors: [{ message: "CEP não encontrado" }],
					}),
				});

				await expect(getAddressInfoByCep("00000000", { providers: ["brasilapi"] })).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should throw GetAddressInfoByCepNotFoundError when BrasilAPI returns errors even if cep is present", async () => {
				setupFetchMock(fetchMock, {
					brasilapi: createJsonResponse({
						cep: VALID_CEP,
						errors: [{ message: "CEP não encontrado" }],
					}),
				});

				await expect(getAddressInfoByCep(VALID_CEP, { providers: ["brasilapi"] })).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should strip non-digit characters from BrasilAPI's cep", async () => {
				setupFetchMock(fetchMock, {
					brasilapi: createJsonResponse({ ...brasilApiPayload, cep: "01310-100" }),
				});

				const result = await getAddressInfoByCep(VALID_CEP, { providers: ["brasilapi"] });

				expect(result.cep).toBe(VALID_CEP);
			});

			it("should throw GetAddressInfoByCepNotFoundError when all providers return not found", async () => {
				setupFetchMock(fetchMock, {
					brasilapi: createJsonResponse({
						errors: [{ message: "CEP não encontrado" }],
					}),
					viacep: createJsonResponse({
						erro: true,
					}),
					widenet: createJsonResponse({
						ok: false,
						status: 404,
					}),
				});

				await expect(getAddressInfoByCep("00000000")).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should throw GetAddressInfoByCepServiceError with the Portuguese message when all providers fail with network errors", async () => {
				setupFetchMock(fetchMock, {
					brasilapi: new Error("Connection failed"),
					viacep: new Error("Network error"),
					widenet: new Error("Timeout"),
				});

				await expect(getAddressInfoByCep(VALID_CEP)).rejects.toThrow(
					GetAddressInfoByCepServiceError,
				);
				await expect(getAddressInfoByCep(VALID_CEP)).rejects.toThrow(
					"Todos os serviços estão fora de serviço ou indisponíveis",
				);
			});

			it("should throw GetAddressInfoByCepServiceError when all providers return HTTP errors", async () => {
				setupFetchMock(fetchMock, {
					brasilapi: createJsonResponse({}, 500),
					viacep: createJsonResponse({}, 500),
					widenet: createJsonResponse({}, 503),
				});

				await expect(getAddressInfoByCep(VALID_CEP)).rejects.toThrow(
					GetAddressInfoByCepServiceError,
				);
			});

			it("should throw GetAddressInfoByCepNotFoundError when BrasilAPI answers 404, the status it reports an unknown CEP with", async () => {
				setupFetchMock(fetchMock, {
					brasilapi: createJsonResponse({ errors: [{ message: "CEP não encontrado" }] }, 404),
				});

				await expect(getAddressInfoByCep(VALID_CEP, { providers: ["brasilapi"] })).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should throw GetAddressInfoByCepServiceError when BrasilAPI answers 404 but another provider failed to answer", async () => {
				setupFetchMock(fetchMock, {
					brasilapi: createJsonResponse({ errors: [{ message: "CEP não encontrado" }] }, 404),
					viacep: new Error("Network error"),
				});

				await expect(getAddressInfoByCep(VALID_CEP)).rejects.toThrow(
					GetAddressInfoByCepServiceError,
				);
			});

			it("should throw GetAddressInfoByCepNotFoundError when BrasilAPI answers 404 and ViaCEP does not know the CEP either", async () => {
				setupFetchMock(fetchMock, {
					brasilapi: createJsonResponse({ errors: [{ message: "CEP não encontrado" }] }, 404),
					viacep: createJsonResponse({ erro: true }),
				});

				await expect(getAddressInfoByCep(VALID_CEP)).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should throw GetAddressInfoByCepServiceError when BrasilAPI answers 404 and ViaCEP answers an error status", async () => {
				setupFetchMock(fetchMock, {
					brasilapi: createJsonResponse({ errors: [{ message: "CEP não encontrado" }] }, 404),
					viacep: createJsonResponse({}, 500),
				});

				await expect(getAddressInfoByCep(VALID_CEP)).rejects.toThrow(
					GetAddressInfoByCepServiceError,
				);
			});

			it("should throw GetAddressInfoByCepServiceError when BrasilAPI answers a non-404 error status", async () => {
				setupFetchMock(fetchMock, {
					brasilapi: createJsonResponse({}, 500),
				});

				await expect(getAddressInfoByCep(VALID_CEP, { providers: ["brasilapi"] })).rejects.toThrow(
					GetAddressInfoByCepServiceError,
				);
			});

			it("should throw GetAddressInfoByCepNotFoundError when every provider returns a payload that is not an object", async () => {
				setupFetchMock(fetchMock, {
					brasilapi: createJsonResponse(null),
					viacep: createJsonResponse("oops"),
					widenet: createJsonResponse(42),
				});

				await expect(
					getAddressInfoByCep(VALID_CEP, { providers: ["viacep", "brasilapi", "widenet"] }),
				).rejects.toThrow(GetAddressInfoByCepNotFoundError);
			});

			it("should throw GetAddressInfoByCepNotFoundError when ViaCEP returns an empty cep", async () => {
				setupFetchMock(fetchMock, { viacep: createJsonResponse({ ...viacepPayload, cep: "" }) });

				await expect(getAddressInfoByCep(VALID_CEP, { providers: ["viacep"] })).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should throw GetAddressInfoByCepNotFoundError when Widenet returns an empty code", async () => {
				setupFetchMock(fetchMock, { widenet: createJsonResponse({ ...widenetPayload, code: "" }) });

				await expect(getAddressInfoByCep(VALID_CEP, { providers: ["widenet"] })).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should throw GetAddressInfoByCepNotFoundError when BrasilAPI returns an empty cep", async () => {
				setupFetchMock(fetchMock, {
					brasilapi: createJsonResponse({ ...brasilApiPayload, cep: "" }),
				});

				await expect(getAddressInfoByCep(VALID_CEP, { providers: ["brasilapi"] })).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should treat a field that is not a string as missing", async () => {
				setupFetchMock(fetchMock, {
					viacep: createJsonResponse({ ...viacepPayload, uf: 12, localidade: null }),
				});

				const result = await getAddressInfoByCep(VALID_CEP, { providers: ["viacep"] });

				expect(result.state).toBe("");
				expect(result.city).toBe("");
				expect(result.street).toBe("Avenida Paulista");
			});

			it("should return first successful response when some providers fail", async () => {
				setupFetchMock(fetchMock, {
					brasilapi: createJsonResponse(brasilApiPayload),
					viacep: new Error("Network error"),
					widenet: createJsonResponse({}, 503),
				});

				const result = await getAddressInfoByCep(VALID_CEP);

				expect(result).toBeDefined();
				expect(result.cep).toBe(VALID_CEP);
				expect(result.city).toBe("São Paulo");
			});

			it("should prioritize GetAddressInfoByCepNotFoundError over GetAddressInfoByCepServiceError when mixed", async () => {
				setupFetchMock(fetchMock, {
					brasilapi: createJsonResponse({
						errors: [{ message: "CEP não encontrado" }],
					}),
					viacep: createJsonResponse({
						erro: true,
					}),
					widenet: new Error("Network error"),
				});

				await expect(getAddressInfoByCep("00000000")).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should prioritize GetAddressInfoByCepNotFoundError when mixed across only 2 providers", async () => {
				setupFetchMock(fetchMock, {
					brasilapi: new Error("Network error"),
					viacep: createJsonResponse({ erro: true }),
				});

				await expect(
					getAddressInfoByCep("00000000", { providers: ["viacep", "brasilapi"] }),
				).rejects.toThrow(GetAddressInfoByCepNotFoundError);
			});

			it("should throw GetAddressInfoByCepServiceError when 2 providers both fail with network errors", async () => {
				setupFetchMock(fetchMock, {
					brasilapi: new Error("Network error"),
					viacep: new Error("Connection failed"),
				});

				await expect(
					getAddressInfoByCep(VALID_CEP, { providers: ["viacep", "brasilapi"] }),
				).rejects.toThrow(GetAddressInfoByCepServiceError);
			});

			it("should include the Portuguese message when a CEP is not found in any service", async () => {
				setupFetchMock(fetchMock, {
					viacep: createJsonResponse({ erro: true }),
				});

				await expect(getAddressInfoByCep("00000000", { providers: ["viacep"] })).rejects.toThrow(
					"CEP não encontrado em nenhum serviço",
				);
			});
		});

		describe("missing optional fields default to empty string", () => {
			it("should default bairro/localidade/logradouro to empty string for ViaCEP", async () => {
				setupFetchMock(fetchMock, {
					viacep: createJsonResponse({ cep: "01310-100", uf: "SP" }),
				});

				const result = await getAddressInfoByCep(VALID_CEP, { providers: ["viacep"] });

				expect(result.neighborhood).toBe("");
				expect(result.city).toBe("");
				expect(result.street).toBe("");
			});

			it("should default uf to empty string for ViaCEP", async () => {
				setupFetchMock(fetchMock, {
					viacep: createJsonResponse({ cep: "01310-100" }),
				});

				const result = await getAddressInfoByCep(VALID_CEP, { providers: ["viacep"] });

				expect(result.state).toBe("");
			});

			it("should default district/city/address to empty string for Widenet", async () => {
				setupFetchMock(fetchMock, {
					widenet: createJsonResponse({ code: "01310-100", ok: true, status: 200 }),
				});

				const result = await getAddressInfoByCep(VALID_CEP, { providers: ["widenet"] });

				expectEmptyAddressFields(result);
			});

			it("should default neighborhood/city/street to empty string for BrasilAPI", async () => {
				setupFetchMock(fetchMock, {
					brasilapi: createJsonResponse({ cep: VALID_CEP }),
				});

				const result = await getAddressInfoByCep(VALID_CEP, { providers: ["brasilapi"] });

				expectEmptyAddressFields(result);
			});
		});

		describe("answers that contradict the CEP", () => {
			it("should reject a ViaCEP address of another CEP as not found", async () => {
				setupFetchMock(fetchMock, {
					viacep: createJsonResponse({ ...viacepPayload, cep: "01310-101" }),
				});

				await expect(getAddressInfoByCep(VALID_CEP, { providers: ["viacep"] })).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should reject a Widenet address of another CEP as not found", async () => {
				setupFetchMock(fetchMock, {
					widenet: createJsonResponse({ ...widenetPayload, code: "01310-101" }),
				});

				await expect(getAddressInfoByCep(VALID_CEP, { providers: ["widenet"] })).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should reject a BrasilAPI address of another CEP as not found", async () => {
				setupFetchMock(fetchMock, {
					brasilapi: createJsonResponse({ ...brasilApiPayload, cep: "01310101" }),
				});

				await expect(getAddressInfoByCep(VALID_CEP, { providers: ["brasilapi"] })).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should reject a ViaCEP address of another state as not found", async () => {
				setupFetchMock(fetchMock, { viacep: createJsonResponse({ ...viacepPayload, uf: "PR" }) });

				await expect(getAddressInfoByCep(VALID_CEP, { providers: ["viacep"] })).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should reject a Widenet address of another state as not found", async () => {
				setupFetchMock(fetchMock, {
					widenet: createJsonResponse({ ...widenetPayload, state: "PR" }),
				});

				await expect(getAddressInfoByCep(VALID_CEP, { providers: ["widenet"] })).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should reject the made up BrasilAPI address of 99999-999, a Rio Grande do Sul CEP, in Paraná", async () => {
				setupFetchMock(fetchMock, {
					brasilapi: createJsonResponse({
						cep: "99999999",
						city: "Sarandi",
						neighborhood: "",
						state: "PR",
						street: "",
					}),
					viacep: createJsonResponse({ erro: "true" }),
				});

				await expect(getAddressInfoByCep("99999999")).rejects.toThrow(
					GetAddressInfoByCepNotFoundError,
				);
			});

			it("should resolve with the provider that agrees when another contradicts the CEP", async () => {
				setupFetchMock(fetchMock, { viacep: createJsonResponse({ ...viacepPayload, uf: "RJ" }) });

				expectDefaultAddress(await getAddressInfoByCep(VALID_CEP));
			});

			it("should accept a state in another case, since the state is compared as a state code", async () => {
				setupFetchMock(fetchMock, { viacep: createJsonResponse({ ...viacepPayload, uf: "sp" }) });

				const result = await getAddressInfoByCep(VALID_CEP, { providers: ["viacep"] });

				expect(result.state).toBe("sp");
			});

			it("should accept an address that names no state", async () => {
				setupFetchMock(fetchMock, {
					viacep: createJsonResponse({ ...viacepPayload, uf: undefined }),
				});

				const result = await getAddressInfoByCep(VALID_CEP, { providers: ["viacep"] });

				expect(result.state).toBe("");
			});

			it("should not compare the state of a CEP that no state range covers", async () => {
				setupFetchMock(fetchMock, {
					viacep: createJsonResponse({ ...viacepPayload, cep: "00500-000", uf: "SP" }),
				});

				const result = await getAddressInfoByCep("00500000", { providers: ["viacep"] });

				expect(result.cep).toBe("00500000");
				expect(result.state).toBe("SP");
			});
		});

		describe("provider integration", () => {
			it("should fetch address from ViaCEP", async () => {
				const result = await getAddressInfoByCep(VALID_CEP, {
					providers: ["viacep"],
				});

				expectAddressFound(result);
			});

			it("should fetch address from Widenet", async () => {
				const result = await getAddressInfoByCep(VALID_CEP, {
					providers: ["widenet"],
				});

				expectAddressFound(result);
			});

			it("should fetch address from BrasilAPI", async () => {
				const result = await getAddressInfoByCep(VALID_CEP, {
					providers: ["brasilapi"],
				});

				expectAddressFound(result);
			});

			it("should return first successful response from multiple providers", async () => {
				const result = await getAddressInfoByCep(VALID_CEP);

				expectDefaultAddress(result);
			});
		});
	});

	const liveDescribe = RUN_LIVE_CEP_TESTS ? describe : describe.skip;

	liveDescribe("live API integration", () => {
		it(
			"should fetch live address from ViaCEP",
			async () => {
				const result = await getAddressInfoByCep(VALID_CEP, {
					providers: ["viacep"],
				});

				expectAddressFound(result);
			},
			LIVE_TEST_TIMEOUT,
		);

		describe.skip("Widenet, skipped while the service answers HTTP 502 (since September 2026, the reason it left the default provider list)", () => {
			it(
				"should fetch live address from Widenet",
				async () => {
					const result = await getAddressInfoByCep(VALID_CEP, {
						providers: ["widenet"],
					});

					expectAddressFound(result);
				},
				LIVE_TEST_TIMEOUT,
			);
		});

		it(
			"should fetch live address from BrasilAPI",
			async () => {
				const result = await getAddressInfoByCep(VALID_CEP, {
					providers: ["brasilapi"],
				});

				expectAddressFound(result);
			},
			LIVE_TEST_TIMEOUT,
		);

		it(
			"should fetch live address from the first successful provider",
			async () => {
				const result = await getAddressInfoByCep(VALID_CEP);

				expectAddressFound(result);
			},
			LIVE_TEST_TIMEOUT,
		);
	});
});

describe("getAddressInfoByCep types", () => {
	it("should take a string or number CEP, optional providers, and resolve to an AddressInfo", () => {
		expectTypeOf(getAddressInfoByCep).parameter(0).toEqualTypeOf<string | number>();
		expectTypeOf(getAddressInfoByCep)
			.parameter(1)
			.toEqualTypeOf<GetAddressInfoByCepOptions | undefined>();
		expectTypeOf<GetAddressInfoByCepOptions["providers"]>().toEqualTypeOf<
			CepProvider[] | undefined
		>();
		expectTypeOf<CepProvider>().toEqualTypeOf<"viacep" | "widenet" | "brasilapi">();
		expectTypeOf(getAddressInfoByCep).returns.resolves.toEqualTypeOf<AddressInfo>();
		expectTypeOf<AddressInfo>().toEqualTypeOf<{
			cep: string;
			state: string;
			city: string;
			neighborhood: string;
			street: string;
		}>();
	});

	it("should expose error classes that extend the base error", () => {
		expectTypeOf(new GetAddressInfoByCepNotFoundError("m")).toExtend<GetAddressInfoByCepError>();
		expectTypeOf(new GetAddressInfoByCepServiceError("m")).toExtend<GetAddressInfoByCepError>();
		expectTypeOf(new GetAddressInfoByCepValidationError("m")).toExtend<GetAddressInfoByCepError>();
		expectTypeOf(new GetAddressInfoByCepError("m")).toExtend<Error>();
	});
});
