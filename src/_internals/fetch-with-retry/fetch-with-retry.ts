import { isNullish } from "../is-nullish/is-nullish.ts";

export type FetchWithRetryOptions = RequestInit & {
	/** How many times to retry a failed request (default: 2). */
	retries?: number;
	/** Delay between retries, in milliseconds (default: 250). */
	retryDelayMs?: number;
};

const RETRYABLE_ERROR_CODES = new Set([
	"UND_ERR_SOCKET",
	"UND_ERR_CONNECT_TIMEOUT",
	"UND_ERR_HEADERS_TIMEOUT",
	"UND_ERR_BODY_TIMEOUT",
	"ECONNRESET",
	"ECONNREFUSED",
	"EHOSTUNREACH",
	"ENETUNREACH",
	"ETIMEDOUT",
]);

const getErrorCode = (error: unknown): string | undefined => {
	if (isNullish(error) || typeof error !== "object") return undefined;

	const code = "code" in error ? error.code : undefined;

	if (typeof code === "string") {
		return code;
	}

	const cause = "cause" in error ? error.cause : undefined;

	if (isNullish(cause) || typeof cause !== "object") return undefined;

	const causeCode = "code" in cause ? cause.code : undefined;

	// Stryker disable next-line ConditionalExpression: RETRYABLE_ERROR_CODES.includes() only ever
	// matches an exact string, so a non-string causeCode reaching that check behaves identically to
	// undefined; the type check below exists only to satisfy the string | undefined return type.
	return typeof causeCode === "string" ? causeCode : undefined;
};

const isRetryableFetchError = (error: unknown): boolean => {
	const code = getErrorCode(error);

	// Stryker disable next-line ConditionalExpression: RETRYABLE_ERROR_CODES.has() only ever
	// matches an exact string, so an undefined code reaching that check behaves identically to
	// skipping it; the undefined check below exists only to satisfy Set<string>#has's parameter type.
	if (code !== undefined && RETRYABLE_ERROR_CODES.has(code)) {
		return true;
	}

	if (!(error instanceof Error)) {
		return false;
	}

	return error.message.toLowerCase().includes("fetch failed");
};

const wait = (ms: number): Promise<void> =>
	ms <= 0
		? Promise.resolve()
		: new Promise((resolve) => {
				setTimeout(resolve, ms);
			});

/**
 * Performs the attempts of `fetchWithRetry` in a loop: the first attempt plus one retry per
 * `retries`, waiting `retryDelayMs * attempt` before each retry. Written as a loop rather than a
 * recursive attempt so a long retry budget never grows the call stack. A negative `retries`
 * rejects before any attempt, as it always did.
 *
 * @param {string|URL|Request} input - The resource to fetch.
 * @param {RequestInit} init - The `fetch` init.
 * @param {number} retries - How many retries follow the first attempt.
 * @param {number} retryDelayMs - The base delay, multiplied by the attempt number.
 * @returns {Promise<Response>} The first successful `fetch` response.
 */
const attemptFetch = async (
	input: string | URL | Request,
	init: RequestInit,
	retries: number,
	retryDelayMs: number,
): Promise<Response> => {
	if (!Number.isInteger(retries) || retries < 0) {
		throw new RangeError("retries must be an integer of zero or greater");
	}

	let attempt = 0;

	for (;;) {
		try {
			// eslint-disable-next-line no-await-in-loop
			return await fetch(input, init);
		} catch (error) {
			if (attempt >= retries || !isRetryableFetchError(error)) {
				throw error;
			}
		}

		attempt++;
		// Retries are sequential by definition: each one waits for the previous failure and its backoff.
		// eslint-disable-next-line no-await-in-loop
		await wait(retryDelayMs * attempt);
	}
};

/**
 * Performs a `fetch` retrying transient network failures with a linear backoff.
 *
 * Only failures accepted by `isRetryableFetchError` are retried; every other rejection is
 * rethrown immediately. HTTP error statuses are not retried, since they resolve rather than
 * reject.
 *
 * @param {string|URL|Request} input - The resource to fetch.
 * @param {FetchWithRetryOptions} [options] - `fetch` init plus `retries` and `retryDelayMs`.
 * @returns {Promise<Response>} The `fetch` response.
 *
 * @example
 * ```typescript
 * await fetchWithRetry("https://viacep.com.br/ws/01001000/json/", { retries: 1, retryDelayMs: 0 });
 * ```
 */
export const fetchWithRetry = (
	input: string | URL | Request,
	{ retries = 2, retryDelayMs = 250, ...init }: FetchWithRetryOptions = {},
): Promise<Response> => attemptFetch(input, init, retries, retryDelayMs);
