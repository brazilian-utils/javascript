/**
 * One Brazilian state, as returned by `getStates`, `getStateByIbgeCode` and the other state
 * utils. Every state is its own member of the union, so the fields of a state are tied to each
 * other: `Extract<State, { code: "SP" }>["name"]` is `"São Paulo"`, and narrowing a `State` by
 * `code` narrows its `name`, `regionCode`, `regionName` and `ibgeCode` too. An impossible
 * combination such as `{ code: "SP", name: "Acre" }` is not a `State`.
 *
 * Each member has the two letter code of the state (`code`, e.g. `"SP"`), its full name
 * (`name`, e.g. `"São Paulo"`), the code and the full name of the region it belongs to
 * (`regionCode` and `regionName`, e.g. `"SE"` and `"Sudeste"`), the 2 digit IBGE code of the
 * Federative Unit (`ibgeCode`, the "cUF", e.g. `35`), the IBGE identifier of its region
 * (`regionIbgeCode`, the first digit of `ibgeCode`, e.g. `3`) and its capital (`capital`, the 7 digit
 * IBGE code and the name of the municipality, e.g. `{ code: "3550308", name: "São Paulo" }`; for
 * the Distrito Federal, which has no municipalities, Brasília with the code of the whole district).
 *
 * `regionIbgeCode` and `capital` came after 2.4.0: every state util fills them, but they are
 * optional in the type so that a `State` built before them still type-checks. They become
 * required in the next major version.
 */
export type State =
	| {
			readonly code: "AC";
			readonly name: "Acre";
			readonly regionCode: "N";
			readonly regionName: "Norte";
			readonly ibgeCode: 12;
			readonly regionIbgeCode?: 1;
			readonly capital?: { readonly code: "1200401"; readonly name: "Rio Branco" };
	  }
	| {
			readonly code: "AL";
			readonly name: "Alagoas";
			readonly regionCode: "NE";
			readonly regionName: "Nordeste";
			readonly ibgeCode: 27;
			readonly regionIbgeCode?: 2;
			readonly capital?: { readonly code: "2704302"; readonly name: "Maceió" };
	  }
	| {
			readonly code: "AP";
			readonly name: "Amapá";
			readonly regionCode: "N";
			readonly regionName: "Norte";
			readonly ibgeCode: 16;
			readonly regionIbgeCode?: 1;
			readonly capital?: { readonly code: "1600303"; readonly name: "Macapá" };
	  }
	| {
			readonly code: "AM";
			readonly name: "Amazonas";
			readonly regionCode: "N";
			readonly regionName: "Norte";
			readonly ibgeCode: 13;
			readonly regionIbgeCode?: 1;
			readonly capital?: { readonly code: "1302603"; readonly name: "Manaus" };
	  }
	| {
			readonly code: "BA";
			readonly name: "Bahia";
			readonly regionCode: "NE";
			readonly regionName: "Nordeste";
			readonly ibgeCode: 29;
			readonly regionIbgeCode?: 2;
			readonly capital?: { readonly code: "2927408"; readonly name: "Salvador" };
	  }
	| {
			readonly code: "CE";
			readonly name: "Ceará";
			readonly regionCode: "NE";
			readonly regionName: "Nordeste";
			readonly ibgeCode: 23;
			readonly regionIbgeCode?: 2;
			readonly capital?: { readonly code: "2304400"; readonly name: "Fortaleza" };
	  }
	| {
			readonly code: "DF";
			readonly name: "Distrito Federal";
			readonly regionCode: "CO";
			readonly regionName: "Centro-Oeste";
			readonly ibgeCode: 53;
			readonly regionIbgeCode?: 5;
			readonly capital?: { readonly code: "5300108"; readonly name: "Brasília" };
	  }
	| {
			readonly code: "ES";
			readonly name: "Espírito Santo";
			readonly regionCode: "SE";
			readonly regionName: "Sudeste";
			readonly ibgeCode: 32;
			readonly regionIbgeCode?: 3;
			readonly capital?: { readonly code: "3205309"; readonly name: "Vitória" };
	  }
	| {
			readonly code: "GO";
			readonly name: "Goiás";
			readonly regionCode: "CO";
			readonly regionName: "Centro-Oeste";
			readonly ibgeCode: 52;
			readonly regionIbgeCode?: 5;
			readonly capital?: { readonly code: "5208707"; readonly name: "Goiânia" };
	  }
	| {
			readonly code: "MA";
			readonly name: "Maranhão";
			readonly regionCode: "NE";
			readonly regionName: "Nordeste";
			readonly ibgeCode: 21;
			readonly regionIbgeCode?: 2;
			readonly capital?: { readonly code: "2111300"; readonly name: "São Luís" };
	  }
	| {
			readonly code: "MT";
			readonly name: "Mato Grosso";
			readonly regionCode: "CO";
			readonly regionName: "Centro-Oeste";
			readonly ibgeCode: 51;
			readonly regionIbgeCode?: 5;
			readonly capital?: { readonly code: "5103403"; readonly name: "Cuiabá" };
	  }
	| {
			readonly code: "MS";
			readonly name: "Mato Grosso do Sul";
			readonly regionCode: "CO";
			readonly regionName: "Centro-Oeste";
			readonly ibgeCode: 50;
			readonly regionIbgeCode?: 5;
			readonly capital?: { readonly code: "5002704"; readonly name: "Campo Grande" };
	  }
	| {
			readonly code: "MG";
			readonly name: "Minas Gerais";
			readonly regionCode: "SE";
			readonly regionName: "Sudeste";
			readonly ibgeCode: 31;
			readonly regionIbgeCode?: 3;
			readonly capital?: { readonly code: "3106200"; readonly name: "Belo Horizonte" };
	  }
	| {
			readonly code: "PA";
			readonly name: "Pará";
			readonly regionCode: "N";
			readonly regionName: "Norte";
			readonly ibgeCode: 15;
			readonly regionIbgeCode?: 1;
			readonly capital?: { readonly code: "1501402"; readonly name: "Belém" };
	  }
	| {
			readonly code: "PB";
			readonly name: "Paraíba";
			readonly regionCode: "NE";
			readonly regionName: "Nordeste";
			readonly ibgeCode: 25;
			readonly regionIbgeCode?: 2;
			readonly capital?: { readonly code: "2507507"; readonly name: "João Pessoa" };
	  }
	| {
			readonly code: "PR";
			readonly name: "Paraná";
			readonly regionCode: "S";
			readonly regionName: "Sul";
			readonly ibgeCode: 41;
			readonly regionIbgeCode?: 4;
			readonly capital?: { readonly code: "4106902"; readonly name: "Curitiba" };
	  }
	| {
			readonly code: "PE";
			readonly name: "Pernambuco";
			readonly regionCode: "NE";
			readonly regionName: "Nordeste";
			readonly ibgeCode: 26;
			readonly regionIbgeCode?: 2;
			readonly capital?: { readonly code: "2611606"; readonly name: "Recife" };
	  }
	| {
			readonly code: "PI";
			readonly name: "Piauí";
			readonly regionCode: "NE";
			readonly regionName: "Nordeste";
			readonly ibgeCode: 22;
			readonly regionIbgeCode?: 2;
			readonly capital?: { readonly code: "2211001"; readonly name: "Teresina" };
	  }
	| {
			readonly code: "RJ";
			readonly name: "Rio de Janeiro";
			readonly regionCode: "SE";
			readonly regionName: "Sudeste";
			readonly ibgeCode: 33;
			readonly regionIbgeCode?: 3;
			readonly capital?: { readonly code: "3304557"; readonly name: "Rio de Janeiro" };
	  }
	| {
			readonly code: "RN";
			readonly name: "Rio Grande do Norte";
			readonly regionCode: "NE";
			readonly regionName: "Nordeste";
			readonly ibgeCode: 24;
			readonly regionIbgeCode?: 2;
			readonly capital?: { readonly code: "2408102"; readonly name: "Natal" };
	  }
	| {
			readonly code: "RS";
			readonly name: "Rio Grande do Sul";
			readonly regionCode: "S";
			readonly regionName: "Sul";
			readonly ibgeCode: 43;
			readonly regionIbgeCode?: 4;
			readonly capital?: { readonly code: "4314902"; readonly name: "Porto Alegre" };
	  }
	| {
			readonly code: "RO";
			readonly name: "Rondônia";
			readonly regionCode: "N";
			readonly regionName: "Norte";
			readonly ibgeCode: 11;
			readonly regionIbgeCode?: 1;
			readonly capital?: { readonly code: "1100205"; readonly name: "Porto Velho" };
	  }
	| {
			readonly code: "RR";
			readonly name: "Roraima";
			readonly regionCode: "N";
			readonly regionName: "Norte";
			readonly ibgeCode: 14;
			readonly regionIbgeCode?: 1;
			readonly capital?: { readonly code: "1400100"; readonly name: "Boa Vista" };
	  }
	| {
			readonly code: "SC";
			readonly name: "Santa Catarina";
			readonly regionCode: "S";
			readonly regionName: "Sul";
			readonly ibgeCode: 42;
			readonly regionIbgeCode?: 4;
			readonly capital?: { readonly code: "4205407"; readonly name: "Florianópolis" };
	  }
	| {
			readonly code: "SP";
			readonly name: "São Paulo";
			readonly regionCode: "SE";
			readonly regionName: "Sudeste";
			readonly ibgeCode: 35;
			readonly regionIbgeCode?: 3;
			readonly capital?: { readonly code: "3550308"; readonly name: "São Paulo" };
	  }
	| {
			readonly code: "SE";
			readonly name: "Sergipe";
			readonly regionCode: "NE";
			readonly regionName: "Nordeste";
			readonly ibgeCode: 28;
			readonly regionIbgeCode?: 2;
			readonly capital?: { readonly code: "2800308"; readonly name: "Aracaju" };
	  }
	| {
			readonly code: "TO";
			readonly name: "Tocantins";
			readonly regionCode: "N";
			readonly regionName: "Norte";
			readonly ibgeCode: 17;
			readonly regionIbgeCode?: 1;
			readonly capital?: { readonly code: "1721000"; readonly name: "Palmas" };
	  };

/** The two letter code of each Brazilian state, as published by the IBGE. */
export type StateCode = State["code"];

/** The name of each Brazilian state, as published by the IBGE. */
export type StateName = State["name"];

/**
 * Brazilian states published by the IBGE, sorted by name with `localeCompare` in the "pt-BR"
 * locale. `ibgeCode` is the 2-digit IBGE code of the Federative Unit ("cUF"), the same code
 * found in the first field of every DF-e access key (chave de acesso). The optional fields of
 * `State` are left out, so that the utils that only read a name or a code do not bundle the
 * capitals: `completeState` adds them to what a util returns.
 *
 * @see Official: https://servicodados.ibge.gov.br/api/docs/localidades
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
