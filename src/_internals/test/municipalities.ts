import { STATE_CODES } from "../constants/state-codes";
import { type StateCode } from "../constants/states";
import { readMunicipalities } from "../read-municipalities/read-municipalities";

/** The `[name, ibgeCode]` pairs of every state, read out of the packed municipalities tables. */
export const MUNICIPALITIES = Object.fromEntries(
	STATE_CODES.map((stateCode) => [stateCode, readMunicipalities(stateCode)]),
) as Record<StateCode, ReturnType<typeof readMunicipalities>>;
