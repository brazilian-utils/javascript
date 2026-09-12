import { afterEach, beforeEach, describe, expect, it, vi } from "../test/runtime";
import { fetchSortedRecord } from "./fetch-sorted-record";

describe("fetchSortedRecord", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("should return the parsed entries sorted by key", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue(new Response("ignored", { status: 200 }));

		const sorted = await fetchSortedRecord("https://example.com/table", "Table", () =>
			Promise.resolve({
				"5102": "Venda",
				"1102": "Compra",
				"3102": "Compra do exterior",
			}),
		);

		expect(Object.keys(sorted)).toEqual(["1102", "3102", "5102"]);
		expect(sorted).toEqual({
			"1102": "Compra",
			"3102": "Compra do exterior",
			"5102": "Venda",
		});
	});

	it("should sort non-numeric keys alphabetically", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue(new Response("ignored", { status: 200 }));

		const sorted = await fetchSortedRecord("https://example.com/table", "Table", () =>
			Promise.resolve({
				banana: "2",
				apple: "1",
				cherry: "3",
			}),
		);

		expect(Object.keys(sorted)).toEqual(["apple", "banana", "cherry"]);
	});

	it("should hand the response to the parser", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue(new Response("a;1\nb;2", { status: 200 }));

		const sorted = await fetchSortedRecord(
			"https://example.com/table",
			"Table",
			async (response) => {
				const entries: Record<string, string> = {};

				for (const line of (await response.text()).split("\n")) {
					const [key, value] = line.split(";");

					expect(key).toBeDefined();
					expect(value).toBeDefined();

					if (key === undefined || value === undefined) {
						continue;
					}

					entries[key] = value;
				}

				return entries;
			},
		);

		expect(sorted).toEqual({ a: "1", b: "2" });
	});

	it("should reject with the label and status when the response is not ok", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue(new Response("", { status: 503 }));

		await expect(
			fetchSortedRecord("https://example.com/table", "CFOP mirror", () => Promise.resolve({})),
		).rejects.toThrow("CFOP mirror request failed with status 503");
	});
});
