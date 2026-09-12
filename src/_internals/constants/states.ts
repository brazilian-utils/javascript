/** The two letter code of each Brazilian state, as published by the IBGE. */
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

/** The name of each Brazilian state, as published by the IBGE. */
export type StateName =
	| "Acre"
	| "Alagoas"
	| "Amapá"
	| "Amazonas"
	| "Bahia"
	| "Ceará"
	| "Distrito Federal"
	| "Espírito Santo"
	| "Goiás"
	| "Maranhão"
	| "Mato Grosso"
	| "Mato Grosso do Sul"
	| "Minas Gerais"
	| "Pará"
	| "Paraíba"
	| "Paraná"
	| "Pernambuco"
	| "Piauí"
	| "Rio de Janeiro"
	| "Rio Grande do Norte"
	| "Rio Grande do Sul"
	| "Rondônia"
	| "Roraima"
	| "Santa Catarina"
	| "São Paulo"
	| "Sergipe"
	| "Tocantins";

/** One Brazilian state, as returned by `getStates`, `getStateByIbgeCode` and the other state utils. */
export type State = {
	/** The two letter code of the state, e.g. `"SP"`. */
	readonly code: StateCode;
	/** The full name of the state, e.g. `"São Paulo"`. */
	readonly name: StateName;
	/** The code of the region the state belongs to, e.g. `"SE"`. */
	readonly regionCode: "N" | "NE" | "CO" | "SE" | "S";
	/** The full name of the region the state belongs to, e.g. `"Sudeste"`. */
	readonly regionName: "Norte" | "Nordeste" | "Centro-Oeste" | "Sudeste" | "Sul";
	/** The 2 digit IBGE code of the Federative Unit ("cUF"), e.g. `35`. */
	readonly ibgeCode: number;
};

/**
 * Brazilian states published by the IBGE, sorted by name with `localeCompare` in the "pt-BR"
 * locale. `ibgeCode` is the 2-digit IBGE code of the Federative Unit ("cUF"), the same code
 * found in the first field of every DF-e access key (chave de acesso).
 *
 * @see https://servicodados.ibge.gov.br/api/docs/localidades
 */
export const DATA: readonly State[] = [
	{ code: "AC", name: "Acre", regionCode: "N", regionName: "Norte", ibgeCode: 12 },
	{ code: "AL", name: "Alagoas", regionCode: "NE", regionName: "Nordeste", ibgeCode: 27 },
	{ code: "AP", name: "Amapá", regionCode: "N", regionName: "Norte", ibgeCode: 16 },
	{ code: "AM", name: "Amazonas", regionCode: "N", regionName: "Norte", ibgeCode: 13 },
	{ code: "BA", name: "Bahia", regionCode: "NE", regionName: "Nordeste", ibgeCode: 29 },
	{ code: "CE", name: "Ceará", regionCode: "NE", regionName: "Nordeste", ibgeCode: 23 },
	{
		code: "DF",
		name: "Distrito Federal",
		regionCode: "CO",
		regionName: "Centro-Oeste",
		ibgeCode: 53,
	},
	{ code: "ES", name: "Espírito Santo", regionCode: "SE", regionName: "Sudeste", ibgeCode: 32 },
	{ code: "GO", name: "Goiás", regionCode: "CO", regionName: "Centro-Oeste", ibgeCode: 52 },
	{ code: "MA", name: "Maranhão", regionCode: "NE", regionName: "Nordeste", ibgeCode: 21 },
	{ code: "MT", name: "Mato Grosso", regionCode: "CO", regionName: "Centro-Oeste", ibgeCode: 51 },
	{
		code: "MS",
		name: "Mato Grosso do Sul",
		regionCode: "CO",
		regionName: "Centro-Oeste",
		ibgeCode: 50,
	},
	{ code: "MG", name: "Minas Gerais", regionCode: "SE", regionName: "Sudeste", ibgeCode: 31 },
	{ code: "PA", name: "Pará", regionCode: "N", regionName: "Norte", ibgeCode: 15 },
	{ code: "PB", name: "Paraíba", regionCode: "NE", regionName: "Nordeste", ibgeCode: 25 },
	{ code: "PR", name: "Paraná", regionCode: "S", regionName: "Sul", ibgeCode: 41 },
	{ code: "PE", name: "Pernambuco", regionCode: "NE", regionName: "Nordeste", ibgeCode: 26 },
	{ code: "PI", name: "Piauí", regionCode: "NE", regionName: "Nordeste", ibgeCode: 22 },
	{ code: "RJ", name: "Rio de Janeiro", regionCode: "SE", regionName: "Sudeste", ibgeCode: 33 },
	{
		code: "RN",
		name: "Rio Grande do Norte",
		regionCode: "NE",
		regionName: "Nordeste",
		ibgeCode: 24,
	},
	{ code: "RS", name: "Rio Grande do Sul", regionCode: "S", regionName: "Sul", ibgeCode: 43 },
	{ code: "RO", name: "Rondônia", regionCode: "N", regionName: "Norte", ibgeCode: 11 },
	{ code: "RR", name: "Roraima", regionCode: "N", regionName: "Norte", ibgeCode: 14 },
	{ code: "SC", name: "Santa Catarina", regionCode: "S", regionName: "Sul", ibgeCode: 42 },
	{ code: "SP", name: "São Paulo", regionCode: "SE", regionName: "Sudeste", ibgeCode: 35 },
	{ code: "SE", name: "Sergipe", regionCode: "NE", regionName: "Nordeste", ibgeCode: 28 },
	{ code: "TO", name: "Tocantins", regionCode: "N", regionName: "Norte", ibgeCode: 17 },
];
