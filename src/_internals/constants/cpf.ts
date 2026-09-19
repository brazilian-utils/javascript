import { type StateCode } from "./states";

/** Digits of a CPF. */
export const CPF_LENGTH = 11;

/** Digits of the base of a CPF, the sequential number ahead of the região fiscal digit. */
export const CPF_BASE_LENGTH = 8;

/**
 * The região fiscal digit (the 9th digit of a CPF) of each state, as listed by the Receita
 * Federal in the folheto "Cadastros: CPF e CNPJ": 1 for DF, GO, MT, MS and TO; 2 for PA, AM, AC,
 * AP, RO and RR; 3 for CE, MA and PI; 4 for PE, RN, PB and AL; 5 for BA and SE; 6 for MG; 7 for
 * RJ and ES; 8 for SP; 9 for PR and SC; 0 for RS.
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/educacao-fiscal/educacao_fiscal/folhetos-orientativos/cadastros-dig.pdf
 */
export const CPF_FISCAL_REGION_BY_STATE: Record<StateCode, string> = {
	AC: "2",
	AL: "4",
	AP: "2",
	AM: "2",
	BA: "5",
	CE: "3",
	DF: "1",
	ES: "7",
	GO: "1",
	MA: "3",
	MT: "1",
	MS: "1",
	MG: "6",
	PR: "9",
	PB: "4",
	PA: "2",
	PE: "4",
	PI: "3",
	RN: "4",
	RS: "0",
	RJ: "7",
	RO: "2",
	RR: "2",
	SC: "9",
	SE: "5",
	SP: "8",
	TO: "1",
};
