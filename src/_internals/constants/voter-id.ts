import { type StateCode } from "./states";

/** Federative union code of each state in a voter id, from `01` (SP) to `27` (TO), plus `ZZ` (`28`) for voters abroad. */
export const UF_TO_VOTER_ID_CODE: Record<StateCode | "ZZ", string> = {
	SP: "01",
	MG: "02",
	RJ: "03",
	RS: "04",
	BA: "05",
	PR: "06",
	CE: "07",
	PE: "08",
	SC: "09",
	GO: "10",
	MA: "11",
	PB: "12",
	PA: "13",
	ES: "14",
	PI: "15",
	RN: "16",
	AL: "17",
	MT: "18",
	MS: "19",
	DF: "20",
	SE: "21",
	AM: "22",
	RO: "23",
	AC: "24",
	AP: "25",
	RR: "26",
	TO: "27",
	ZZ: "28",
};

/**
 * Federative union codes ("01" for São Paulo and "02" for Minas Gerais) whose check digits are
 * 1, not 0, when the módulo 11 remainder is 0. This rule has no official source: Resolução TSE
 * nº 23.659/2021, art. 36, and the Resolução TSE nº 21.538/2003 it revoked only say the check
 * digits are "determinados com base no 'Módulo 11'", with no weights and no rule per state. It
 * follows the community references the voter id functions cite as `Based on:`.
 */
export const REMAINDER_ZERO_FEDERATIVE_UNION_CODES: readonly string[] = ["01", "02"];

/** Number of digits of a voter id: 8 sequential digits, 2 federative union digits, 2 check digits. */
export const VOTER_ID_LENGTH = 12;
