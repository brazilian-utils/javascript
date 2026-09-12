import { fetchWithRetry } from "../fetch-with-retry/fetch-with-retry";

/**
 * Fetches a dataset with retry, fails when the response is not ok, and returns the parsed
 * entries sorted by key. Shared by the dataset generator scripts that build a
 * `Record<string, string>` constants table from a remote source.
 *
 * @param {string} url - The dataset URL to fetch.
 * @param {string} label - A short label for the dataset, used in the error message when the
 * request fails.
 * @param {(response: Response) => Promise<Record<string, T>>} parse - Parses the response into
 * an unsorted record.
 * @returns {Promise<Record<string, T>>} The parsed entries, sorted ascending by key.
 */
export const fetchSortedRecord = async <T>(
	url: string,
	label: string,
	parse: (response: Response) => Promise<Record<string, T>>,
): Promise<Record<string, T>> => {
	const response = await fetchWithRetry(url);

	if (!response.ok) {
		throw new Error(`${label} request failed with status ${response.status}`);
	}

	const data = await parse(response);
	const sorted: Record<string, T> = {};

	for (const key of Object.keys(data).sort()) {
		sorted[key] = data[key];
	}

	return sorted;
};
