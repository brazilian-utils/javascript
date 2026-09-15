import { type StateCode } from "./states";

/**
 * Brazilian DDD (area code) data under the Plano Geral de Numeração. `VALID_AREA_CODES` is kept
 * as a bare array of the 67 valid codes for its existing importers; `AREA_CODE_STATES` is a
 * second, richer literal mapping every one of those same 67 codes to the state (UF) that holds
 * all but a handful of its municipalities, and `AREA_CODE_SECONDARY_STATES` carries the other
 * states the four cross-border codes also serve.
 *
 * Resolução Anatel nº 749/2022, art. 15, defines the Código Nacional (area code). The Plano
 * Geral de Códigos Nacionais that art. 15 referred to was revoked by Resolução Anatel nº
 * 755/2022, and the allocation in force is the one Despacho Decisório nº 17/2025/PRRE/SPR
 * approved; Anatel publishes it on the gov.br page below, which lists the codes actually
 * allocated and links, under "POR MUNICÍPIO", to the Anexo of Resolução Anatel nº 263/2001,
 * giving the Código Nacional of every municipality. That Anexo was parsed to derive both
 * tables.
 *
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 * @see Official: https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais
 * @see Based on: https://informacoes.anatel.gov.br/legislacao/resolucoes/2001/383-resolucao-263
 * Anexo of Resolução nº 263/2001 (revoked; still the table Anatel's Códigos Nacionais page links to).
 * @see Based on: https://brasilapi.com.br/docs#tag/DDD
 */
export const VALID_AREA_CODES: readonly number[] = [
	11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43,
	44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 64, 63, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77,
	79, 81, 87, 82, 83, 84, 85, 88, 86, 89, 91, 93, 94, 92, 97, 95, 96, 98, 99,
];

export const AREA_CODE_STATES: Record<number, StateCode> = {
	11: "SP",
	12: "SP",
	13: "SP",
	14: "SP",
	15: "SP",
	16: "SP",
	17: "SP",
	18: "SP",
	19: "SP",
	21: "RJ",
	22: "RJ",
	24: "RJ",
	27: "ES",
	28: "ES",
	31: "MG",
	32: "MG",
	33: "MG",
	34: "MG",
	35: "MG",
	37: "MG",
	38: "MG",
	41: "PR",
	42: "PR",
	43: "PR",
	44: "PR",
	45: "PR",
	46: "PR",
	47: "SC",
	48: "SC",
	49: "SC",
	51: "RS",
	53: "RS",
	54: "RS",
	55: "RS",
	61: "DF",
	62: "GO",
	63: "TO",
	64: "GO",
	65: "MT",
	66: "MT",
	67: "MS",
	68: "AC",
	69: "RO",
	71: "BA",
	73: "BA",
	74: "BA",
	75: "BA",
	77: "BA",
	79: "SE",
	81: "PE",
	82: "AL",
	83: "PB",
	84: "RN",
	85: "CE",
	86: "PI",
	87: "PE",
	88: "CE",
	89: "PI",
	91: "PA",
	92: "AM",
	93: "PA",
	94: "PA",
	95: "RR",
	96: "AP",
	97: "AM",
	98: "MA",
	99: "MA",
};

/**
 * The other states a DDD serves, besides the primary state `AREA_CODE_STATES` gives it. Four
 * Códigos Nacionais straddle a state border:
 *
 * - 61 serves the Distrito Federal and the Goiás municipalities of the Entorno do Distrito
 *   Federal: Águas Lindas de Goiás, Cabeceiras, Cidade Ocidental, Cristalina, Formosa,
 *   Luziânia, Novo Gama, Padre Bernardo, Planaltina, Santo Antônio do Descoberto, Valparaíso
 *   de Goiás and Vila Boa.
 * - 42 serves Paraná and Porto União (SC), across the river from União da Vitória (PR).
 * - 47 serves Santa Catarina and Rio Negro (PR), across the river from Mafra (SC).
 * - 49 serves Santa Catarina and Barracão (PR), on the border with Dionísio Cerqueira (SC).
 *
 * Derived from the Anexo of Resolução Anatel nº 263/2001, which lists the Código Nacional of
 * every municipality, as later amended by Resolução nº 580/2012 (Vila Boa, 62 to 61),
 * Resolução nº 644/2014 (Porto União, 49 to 42) and Resolução nº 701/2018 (Rio Negro, 41 to
 * 47, and Barracão, 46 to 49). No other Código Nacional in that Anexo covers more than one
 * state.
 *
 * @see Official: https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais
 * @see Based on: https://informacoes.anatel.gov.br/legislacao/resolucoes/2001/383-resolucao-263
 * Anexo of Resolução nº 263/2001 (revoked; still the table Anatel's Códigos Nacionais page links to).
 */
export const AREA_CODE_SECONDARY_STATES: Record<number, readonly StateCode[]> = {
	42: ["SC"],
	47: ["PR"],
	49: ["PR"],
	61: ["GO"],
};
