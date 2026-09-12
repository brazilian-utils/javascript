import { STATE_TIMEZONES } from "./constants";

/**
 * Retrieves the IANA time zone database name (tzdata zone) for a Brazilian state, chosen as
 * the zone of the state capital. The match is case-insensitive and ignores leading/trailing
 * whitespace.
 *
 * Some tzdata zones cover more than one state: `America/Sao_Paulo` also covers DF, GO, MG, ES,
 * RJ, PR, SC and RS besides SP, and `America/Fortaleza` also covers MA, PI, RN and PB besides
 * CE. Pernambuco resolves to `America/Recife`, not `America/Noronha`: Fernando de Noronha is an
 * archipelago district of PE, not a state of its own.
 *
 * @param {string} stateCode - The two-letter state code (sigla).
 * @returns {string|null} The IANA time zone name, or `null` when `stateCode` does not match
 * any Brazilian state.
 *
 * @see Official: https://raw.githubusercontent.com/eggert/tz/main/zone1970.tab (IANA tz
 * database, `BR` rows)
 * @see Based on: https://en.wikipedia.org/wiki/Time_in_Brazil Used to confirm the state
 * coverage of each zone.
 *
 * @example
 * ```typescript
 * getTimezoneByState("SP"); // "America/Sao_Paulo"
 * getTimezoneByState("am"); // "America/Manaus"
 * getTimezoneByState("AC"); // "America/Rio_Branco"
 * getTimezoneByState("PE"); // "America/Recife"
 * getTimezoneByState("ZZ"); // null
 * ```
 */
export const getTimezoneByState = (stateCode: string): string | null => {
	if (typeof stateCode !== "string") return null;

	const normalized = stateCode.trim().toUpperCase();

	return Object.hasOwn(STATE_TIMEZONES, normalized) ? STATE_TIMEZONES[normalized] : null;
};
