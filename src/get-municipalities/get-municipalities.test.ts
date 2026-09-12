import { DATA } from "../_internals/constants/cities";
import { describe, expect, it } from "../_internals/test/runtime";
import { getStates } from "../get-states/get-states";
import { getMunicipalities } from "./get-municipalities";

const NUMBER_OF_BRAZILIAN_MUNICIPALITIES = 5571;

const KNOWN_STATE_MUNICIPALITY_COUNTS: Record<string, number> = {
	MG: 853,
	MT: 142,
	RS: 497,
	SP: 645,
};

describe("getMunicipalities", () => {
	it("should return every municipality when no state is given", () => {
		expect(getMunicipalities().length).toBe(NUMBER_OF_BRAZILIAN_MUNICIPALITIES);
	});

	it("should sort the combined list with the pt-BR comparator", () => {
		const municipalities = getMunicipalities();
		const names = municipalities.map((municipality) => municipality.name);
		const sortedNames = [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));

		expect(names).toEqual(sortedNames);
	});

	it("should return municipality objects shaped as { code, name, stateCode }", () => {
		const saoPaulo = getMunicipalities("SP").find(
			(municipality) => municipality.name === "São Paulo",
		);

		expect(saoPaulo).toEqual({ code: "3550308", name: "São Paulo", stateCode: "SP" });
	});

	it("should filter municipalities by state", () => {
		for (const [stateCode, expectedCount] of Object.entries(KNOWN_STATE_MUNICIPALITY_COUNTS)) {
			expect(getMunicipalities(stateCode).length).toBe(expectedCount);
		}
	});

	it("should include Boa Esperança do Norte/MT", () => {
		const municipalities = getMunicipalities("MT");

		expect(municipalities).toContainEqual({
			code: "5101837",
			name: "Boa Esperança do Norte",
			stateCode: "MT",
		});
	});

	it("should return an empty array for an unknown state", () => {
		expect(getMunicipalities("ZZ")).toEqual([]);
	});

	it("should return an empty array for inherited Object property names instead of throwing", () => {
		expect(getMunicipalities("toString")).toEqual([]);
		expect(getMunicipalities("constructor")).toEqual([]);
	});

	it("should return a fresh copy so mutating the result does not affect subsequent calls", () => {
		const all = getMunicipalities();
		all.push({ code: "0000000", name: "MUTATED", stateCode: "SP" });

		expect(getMunicipalities().length).toBe(NUMBER_OF_BRAZILIAN_MUNICIPALITIES);

		const spMunicipalities = getMunicipalities("SP");
		spMunicipalities[0].name = "MUTATED";

		expect(getMunicipalities("SP")[0].name).not.toBe("MUTATED");
	});

	describe("data integrity (IBGE, https://servicodados.ibge.gov.br/api/docs/localidades)", () => {
		it(`should total exactly ${NUMBER_OF_BRAZILIAN_MUNICIPALITIES} municipalities across all states`, () => {
			const total = Object.values(DATA).reduce(
				(sum, municipalities) => sum + municipalities.length,
				0,
			);

			expect(total).toBe(NUMBER_OF_BRAZILIAN_MUNICIPALITIES);
		});

		for (const { code } of getStates()) {
			it(`should return municipalities matching DATA for state ${code}`, () => {
				const expected = DATA[code].map(([name, municipalityCode]) => ({
					code: municipalityCode,
					name,
					stateCode: code,
				}));

				expect(getMunicipalities(code)).toEqual(expected);
			});
		}
	});
});
