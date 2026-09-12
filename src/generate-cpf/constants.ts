import { type StateCode } from "../_internals/constants/states";

export const BASE_LENGTH = 8;

export const STATE_CODES: Record<StateCode, string> = {
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
	MT: "5",
	MS: "5",
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
} as const;
