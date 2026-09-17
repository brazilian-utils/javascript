import { type StateCode } from "./states";

/**
 * IBGE code of the Federative Unit ("cUF"), keyed by the 2 digit code found in the first
 * field of every DF-e access key (chave de acesso): NF-e (modelo 55), NFC-e (modelo 65),
 * CT-e (modelo 57) and MDF-e (modelo 58).
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf
 *   (Manual de Orientação do Contribuinte, "chave de acesso" / "Tabela do IBGE").
 */
export const IBGE_UF_CODES: Record<string, StateCode> = {
	"11": "RO",
	"12": "AC",
	"13": "AM",
	"14": "RR",
	"15": "PA",
	"16": "AP",
	"17": "TO",
	"21": "MA",
	"22": "PI",
	"23": "CE",
	"24": "RN",
	"25": "PB",
	"26": "PE",
	"27": "AL",
	"28": "SE",
	"29": "BA",
	"31": "MG",
	"32": "ES",
	"33": "RJ",
	"35": "SP",
	"41": "PR",
	"42": "SC",
	"43": "RS",
	"50": "MS",
	"51": "MT",
	"52": "GO",
	"53": "DF",
};
