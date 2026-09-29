/**
 * One of the five Brazilian regions (Grandes Regiões), as `getRegions` returns it: the code the
 * IBGE abbreviates it with (`code`, the same as `State["regionCode"]`), its name and its IBGE
 * identifier (`ibgeCode`). Every region is its own member of the union, so narrowing by `code`
 * narrows the other fields too.
 */
export type Region =
	| { readonly code: "N"; readonly name: "Norte"; readonly ibgeCode: 1 }
	| { readonly code: "NE"; readonly name: "Nordeste"; readonly ibgeCode: 2 }
	| { readonly code: "SE"; readonly name: "Sudeste"; readonly ibgeCode: 3 }
	| { readonly code: "S"; readonly name: "Sul"; readonly ibgeCode: 4 }
	| { readonly code: "CO"; readonly name: "Centro-Oeste"; readonly ibgeCode: 5 };

/** The two letter or one letter code of a region, e.g. `"NE"`. */
export type RegionCode = Region["code"];

/**
 * The five regions in the order of their IBGE identifier, the first digit of the code of each of
 * their states.
 *
 * @see Official: https://servicodados.ibge.gov.br/api/v1/localidades/regioes
 * IBGE, API de Localidades, `regioes`: `[{"id":1,"sigla":"N","nome":"Norte"}, ... ,
 * {"id":5,"sigla":"CO","nome":"Centro-Oeste"}]`.
 */
export const REGIONS: readonly Region[] = [
	{ code: "N", name: "Norte", ibgeCode: 1 },
	{ code: "NE", name: "Nordeste", ibgeCode: 2 },
	{ code: "SE", name: "Sudeste", ibgeCode: 3 },
	{ code: "S", name: "Sul", ibgeCode: 4 },
	{ code: "CO", name: "Centro-Oeste", ibgeCode: 5 },
];
