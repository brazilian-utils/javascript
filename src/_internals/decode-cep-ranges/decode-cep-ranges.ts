/** One range of CEPs assigned by the Correios to a municipality. */
export type MunicipalityCepRange = {
	/** 7-digit IBGE code of the municipality that owns the range. */
	readonly code: string;
	/** First CEP of the range, as a number. */
	readonly start: number;
	/** Last CEP of the range, as a number. */
	readonly end: number;
};

const CODE_LENGTH = 7;

/**
 * Reads the packed CEP range table `scripts/municipality-cep-ranges.ts` generates: one `;`
 * separated entry per range, in ascending order, each the 7-digit IBGE code of the municipality
 * followed by the size of the range (its last CEP minus its first) and, when the range does not
 * start right after the previous one, a `.` and the number of CEPs skipped in between. The first
 * range is measured from CEP 0, so `"35503084999998.1000000"` is `{ code: "3550308", start:
 * 1_000_001, end: 5_999_999 }`.
 *
 * @param {string} packed - The packed table.
 * @returns {MunicipalityCepRange[]} Every range, in the order of the table.
 *
 * @example
 * ```typescript
 * decodeCepRanges("35503084999998.1000000;3534401299998");
 * // [{ code: "3550308", start: 1000001, end: 5999999 }, { code: "3534401", start: 6000000, end: 6299998 }]
 * ```
 */
export const decodeCepRanges = (packed: string): MunicipalityCepRange[] => {
	const ranges: MunicipalityCepRange[] = [];
	let end = 0;

	for (const entry of packed.split(";")) {
		const [size, skipped = 0] = entry.slice(CODE_LENGTH).split(".");
		const start = end + 1 + Number(skipped);

		end = start + Number(size);
		ranges.push({ code: entry.slice(0, CODE_LENGTH), start, end });
	}

	return ranges;
};
