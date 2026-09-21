/**
 * Brazilian municipalities, written once.
 */
import { type Dataset, dataAll, dataRows, dataset } from "./_std.ts";

/**
 * The two letter code of a Brazilian state. Checked against the dataset by `data/build.ts`, so
 * the union and the table can never drift apart.
 */
export type StateCode =
	| "AC"
	| "AL"
	| "AP"
	| "AM"
	| "BA"
	| "CE"
	| "DF"
	| "ES"
	| "GO"
	| "MA"
	| "MT"
	| "MS"
	| "MG"
	| "PA"
	| "PB"
	| "PR"
	| "PE"
	| "PI"
	| "RJ"
	| "RN"
	| "RS"
	| "RO"
	| "RR"
	| "SC"
	| "SP"
	| "SE"
	| "TO";

/** One Brazilian municipality, as the IBGE publishes it. */
export type Municipality = {
	/** The 7-digit IBGE municipality code. */
	code: string;
	/** The municipality name. */
	name: string;
	/** The two-letter code of the state the municipality belongs to. */
	stateCode: StateCode;
};

/**
 * The municipalities table: `[stateCode, name, code]` per row, grouped by state, with the
 * combined pt-BR order baked in at build time.
 */
const MUNICIPALITIES: Dataset = dataset("municipalities");

/**
 * Reads one dataset row as a municipality.
 *
 * @param {string[]} row - The `[stateCode, name, code]` row.
 * @returns {Municipality} The municipality.
 */
const rowToMunicipality = (row: string[]): Municipality => ({
	code: row[2],
	name: row[1],
	// The dataset holds plain strings; `data/build.ts` is what keeps the closed set true.
	stateCode: row[0] as StateCode,
});

/**
 * Returns Brazilian municipalities published by the IBGE, optionally filtered by state.
 *
 * If `stateCode` is provided, only municipalities of that state are returned. If it is
 * omitted, every municipality of every state is returned, sorted with `localeCompare` in the
 * "pt-BR" locale so accented names land where a Brazilian reader expects them. Every per-state
 * list is sorted the same way.
 *
 * Only an omitted (or `undefined`) `stateCode` asks for the full list: any other value that is
 * not a known state code, `null` and `""` included, returns `[]`.
 *
 * The state code is matched exactly, case included: `getMunicipalities("sp")` returns `[]` where
 * `getMunicipalities("SP")` returns the 645 São Paulo municipalities.
 *
 * @param {StateCode} [stateCode] - The two letter code of the Brazilian state to filter by.
 * @returns {Municipality[]} A fresh array of fresh `Municipality` objects. Empty when
 * `stateCode` is not a known state.
 *
 * @example
 * ```typescript
 * getMunicipalities("SP")[0]; // { code: "3500105", name: "Adamantina", stateCode: "SP" }
 * getMunicipalities().length; // every municipality of every state
 * getMunicipalities("ZZ"); // []
 * getMunicipalities("sp"); // [] (the state code is case-sensitive here)
 * getMunicipalities(null); // [] (only an omitted state code asks for the full list)
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/docs/localidades
 */
export const getMunicipalities = (stateCode?: StateCode): Municipality[] => {
	const municipalities: Municipality[] = [];
	let rows = dataAll(MUNICIPALITIES);

	if (stateCode !== undefined) {
		rows = dataRows(MUNICIPALITIES, stateCode);
	}

	for (const row of rows) {
		municipalities.push(rowToMunicipality(row));
	}

	return municipalities;
};
