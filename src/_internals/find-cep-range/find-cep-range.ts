import { isValidCep } from "../../is-valid-cep/is-valid-cep";
import { parseCep } from "../../parse-cep/parse-cep";
import { isLookupCode } from "../is-lookup-code/is-lookup-code";

/** One entry of a table `findCepRange` searches: any range with a first and a last CEP. */
type CepRange = {
	/** First CEP of the range, as a number. */
	readonly start: number;
	/** Last CEP of the range, as a number. */
	readonly end: number;
};

/**
 * Validates `value` as `isValidCep` does and finds the entry of `ranges` whose `start`/`end`
 * bounds contain it, shared by every CEP range lookup (`getStateByCep`, `getMunicipalityByCep`)
 * so the validation and the parsing happen only once.
 *
 * `ranges` is searched in order and the first match wins, so a caller whose ranges may overlap
 * controls the answer through their order; every range table this package ships is disjoint,
 * so the order never matters in practice.
 *
 * @param {string|number} value - The CEP, with or without formatting.
 * @param {readonly CepRange[]} ranges - The table to search, each entry at least a `CepRange`.
 * @returns {T|null} The matching entry, or `null` when `value` is not a valid CEP or falls
 * outside every range.
 *
 * @example
 * ```typescript
 * findCepRange("01310-100", [{ start: 1_000_000, end: 19_999_999 }]); // { start: 1_000_000, end: 19_999_999 }
 * findCepRange("00999-999", [{ start: 1_000_000, end: 19_999_999 }]); // null
 * ```
 */
export const findCepRange = <T extends CepRange>(
	value: string | number,
	ranges: readonly T[],
): T | null => {
	if (!isLookupCode(value) || !isValidCep(value)) return null;

	const cep = Number(parseCep(value));

	return ranges.find((entry) => cep >= entry.start && cep <= entry.end) ?? null;
};
