import { afterEach, beforeEach, describe, expect, it, vi } from "../test/runtime";
import { fetchWithRetry } from "./fetch-with-retry";

const TIMER_EARLY_WAKE_UP_MS = 5;

const expectSingleAttemptRejection = async (error: Error) => {
	const fetchMock = vi.fn().mockRejectedValue(error);

	globalThis.fetch = fetchMock;

	await expect(
		fetchWithRetry("https://example.com", { retries: 3, retryDelayMs: 0 }),
	).rejects.toThrow(error);

	return fetchMock;
};

const mockFetchRejectingOnceWith = (error: unknown) =>
	vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce({ ok: true, status: 200 });

const expectRetrySucceeds = async (fetchMock: ReturnType<typeof vi.fn>, retryDelayMs = 0) => {
	globalThis.fetch = fetchMock;

	const response = await fetchWithRetry("https://example.com", { retryDelayMs });

	expect(response.ok).toBe(true);
	expect(fetchMock).toHaveBeenCalledTimes(2);
};

describe("fetchWithRetry", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it("retries transient undici socket failures", async () => {
		const fetchMock = vi
			.fn()
			.mockRejectedValueOnce(
				Object.assign(new TypeError("fetch failed"), {
					cause: { code: "UND_ERR_SOCKET" },
				}),
			)
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
			});

		globalThis.fetch = fetchMock;

		const response = await fetchWithRetry("https://example.com", { retries: 1, retryDelayMs: 0 });

		expect(response.ok).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("does not retry when the cause object has no code", async () => {
		const error = Object.assign(new TypeError("random failure"), { cause: {} });
		const fetchMock = await expectSingleAttemptRejection(error);

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("does not retry non-transient failures", async () => {
		const error = new Error("Invalid URL");
		const fetchMock = await expectSingleAttemptRejection(error);

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("retries when a top level error code is transient", async () => {
		const error = Object.assign(new Error("boom"), { code: "ECONNRESET" });

		await expectRetrySucceeds(mockFetchRejectingOnceWith(error));
	});

	it("retries when the error message says fetch failed", async () => {
		await expectRetrySucceeds(mockFetchRejectingOnceWith(new TypeError("fetch failed")));
	});

	it("does not retry non-error rejections", async () => {
		const fetchMock = vi.fn().mockRejectedValueOnce("fetch failed");
		globalThis.fetch = fetchMock;

		const rejection = await fetchWithRetry("https://example.com", { retryDelayMs: 0 }).then(
			() => {
				throw new Error("expected the fetch to reject");
			},
			(error: unknown) => error,
		);

		expect(rejection).toBe("fetch failed");
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("throws without ever attempting the fetch when retries is negative", async () => {
		const fetchMock = vi.fn();
		globalThis.fetch = fetchMock;

		const rejection = await fetchWithRetry("https://example.com", { retries: -1 }).then(
			() => {
				throw new Error("expected the fetch to reject");
			},
			(error: unknown) => error,
		);

		expect(rejection).toBeUndefined();
		expect(fetchMock).toHaveBeenCalledTimes(0);
	});

	it("retries every known transient error code", async () => {
		const RETRYABLE_CODES = [
			"UND_ERR_SOCKET",
			"UND_ERR_CONNECT_TIMEOUT",
			"UND_ERR_HEADERS_TIMEOUT",
			"UND_ERR_BODY_TIMEOUT",
			"ECONNRESET",
			"ECONNREFUSED",
			"EHOSTUNREACH",
			"ENETUNREACH",
			"ETIMEDOUT",
		];

		const expectEachRetries = async ([code, ...rest]: string[]): Promise<void> => {
			if (code === undefined) return;

			const error = Object.assign(new Error("boom"), { code });

			await expectRetrySucceeds(mockFetchRejectingOnceWith(error));
			await expectEachRetries(rest);
		};

		await expectEachRetries(RETRYABLE_CODES);
	});

	it("does not retry when the error code is unknown", async () => {
		const error = Object.assign(new Error("boom"), { code: "SOME_UNKNOWN_CODE" });
		const fetchMock = await expectSingleAttemptRejection(error);

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("checks the cause code when the top level code is not a string", async () => {
		const error = Object.assign(new Error("boom"), { code: 123, cause: { code: "ECONNRESET" } });

		await expectRetrySucceeds(mockFetchRejectingOnceWith(error));
	});

	it("propagates the original error when the cause is present but null", async () => {
		const error = Object.assign(new Error("boom"), { cause: null });
		const fetchMock = await expectSingleAttemptRejection(error);

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("propagates the original error when the cause is present but not an object", async () => {
		const error = Object.assign(new Error("boom"), { cause: "not an object" });
		const fetchMock = await expectSingleAttemptRejection(error);

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("does not schedule a timer when the retry delay is zero or negative", async () => {
		const setTimeoutSpy = vi.fn((callback: () => void) => {
			callback();
			return 0;
		});
		const originalSetTimeout = globalThis.setTimeout;
		globalThis.setTimeout = setTimeoutSpy;

		try {
			const error = Object.assign(new Error("boom"), { code: "ECONNRESET" });

			await expectRetrySucceeds(mockFetchRejectingOnceWith(error));
		} finally {
			globalThis.setTimeout = originalSetTimeout;
		}

		expect(setTimeoutSpy).not.toHaveBeenCalled();
	});

	it("actually waits before retrying instead of resolving immediately", async () => {
		globalThis.fetch = mockFetchRejectingOnceWith(
			Object.assign(new Error("boom"), { code: "ECONNRESET" }),
		);

		const start = Date.now();
		const response = await fetchWithRetry("https://example.com", { retries: 1, retryDelayMs: 40 });
		const elapsed = Date.now() - start;

		expect(response.ok).toBe(true);
		expect(elapsed).toBeGreaterThanOrEqual(40 - TIMER_EARLY_WAKE_UP_MS);
	});

	it("throws immediately without waiting when the last attempt fails", async () => {
		const error = Object.assign(new Error("boom"), { code: "ECONNRESET" });
		const fetchMock = vi.fn().mockRejectedValue(error);
		globalThis.fetch = fetchMock;

		const start = Date.now();
		await expect(
			fetchWithRetry("https://example.com", { retries: 0, retryDelayMs: 200 }),
		).rejects.toThrow(error);
		const elapsed = Date.now() - start;

		expect(elapsed).toBeLessThan(100);
	});

	it("increases the wait delay linearly with each retry attempt", async () => {
		const fetchMock = vi
			.fn()
			.mockRejectedValueOnce(Object.assign(new Error("first"), { code: "ECONNRESET" }))
			.mockRejectedValueOnce(Object.assign(new Error("second"), { code: "ECONNRESET" }))
			.mockResolvedValueOnce({ ok: true, status: 200 });
		globalThis.fetch = fetchMock;

		const start = Date.now();
		const response = await fetchWithRetry("https://example.com", { retries: 2, retryDelayMs: 40 });
		const elapsed = Date.now() - start;

		expect(response.ok).toBe(true);
		expect(elapsed).toBeGreaterThanOrEqual(40 + 80 - TIMER_EARLY_WAKE_UP_MS);
	});
});
