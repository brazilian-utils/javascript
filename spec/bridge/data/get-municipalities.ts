/**
 * The municipalities table, with the pt-BR order the JavaScript package returns baked in.
 *
 * Two orders are resolved here: the per state one, which is the order the package already
 * returns for a state, and the combined one, which is every state's rows merged and sorted by
 * name with the pt-BR collator. Neither is recomputed at run time, because no two targets
 * would agree on it.
 */
import { type DataDecl } from "../compiler/ir.ts";
import { type Builder } from "./_builder.ts";

type Municipality = { code: string; name: string; stateCode: string };

export const builder: Builder = {
	module: "get-municipalities",

	build: (shipped): Omit<DataDecl, "name"> => {
		const getStates = shipped["getStates"] as () => { code: string }[];
		const getMunicipalities = shipped["getMunicipalities"] as (
			stateCode?: string,
		) => Municipality[];

		const rows: string[][] = [];
		const groups: Record<string, number[]> = {};

		// The per state order is the order the package itself returns, already the pt-BR one.
		for (const state of getStates()) {
			groups[state.code] = [];

			for (const municipality of getMunicipalities(state.code)) {
				groups[state.code].push(rows.length);
				rows.push([municipality.stateCode, municipality.name, municipality.code]);
			}
		}

		// Matching the combined list by (name, code) rather than by position keeps this honest
		// even if the package ever changes how it merges the states.
		const byKey = new Map<string, number>();

		for (const [index, row] of rows.entries()) byKey.set(`${row[1]}\u0000${row[2]}`, index);

		const fullOrder = getMunicipalities().map((municipality) => {
			const index = byKey.get(`${municipality.name}\u0000${municipality.code}`);

			if (index === undefined)
				throw new Error(`the full list holds ${municipality.name} but no state does`);

			return index;
		});

		if (fullOrder.length !== rows.length)
			throw new Error(
				`the full list has ${fullOrder.length} rows but the states have ${rows.length}`,
			);

		return {
			doc: "Brazilian municipalities published by the IBGE, by state, in the pt-BR collation order the JavaScript package returns.",
			columns: ["stateCode", "name", "code"],
			rows,
			groups,
			fullOrder,
		};
	},
};
