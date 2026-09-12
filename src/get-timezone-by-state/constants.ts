/**
 * IANA time zone database (tzdata) name for each Brazilian state, chosen as the zone of the
 * state capital per the official `zone1970.tab` comments (some tzdata zones span more than
 * one state, e.g. `America/Sao_Paulo` also covers DF, GO, MG, ES, RJ, PR, SC and RS, and
 * `America/Fortaleza` also covers MA, PI, RN and PB besides CE). Pernambuco maps to
 * `America/Recife`, not `America/Noronha`: Fernando de Noronha is an archipelago district of
 * PE, not a state of its own, and its distinct UTC-02:00 offset is out of scope here.
 *
 * @see Official: https://raw.githubusercontent.com/eggert/tz/main/zone1970.tab (IANA tz
 * database, `BR` rows)
 * @see Based on: https://en.wikipedia.org/wiki/Time_in_Brazil Used to confirm the state
 * coverage of each zone.
 */
export const STATE_TIMEZONES: Record<string, string> = {
	AC: "America/Rio_Branco",
	AL: "America/Maceio",
	AM: "America/Manaus",
	AP: "America/Belem",
	BA: "America/Bahia",
	CE: "America/Fortaleza",
	DF: "America/Sao_Paulo",
	ES: "America/Sao_Paulo",
	GO: "America/Sao_Paulo",
	MA: "America/Fortaleza",
	MG: "America/Sao_Paulo",
	MS: "America/Campo_Grande",
	MT: "America/Cuiaba",
	PA: "America/Belem",
	PB: "America/Fortaleza",
	PE: "America/Recife",
	PI: "America/Fortaleza",
	PR: "America/Sao_Paulo",
	RJ: "America/Sao_Paulo",
	RN: "America/Fortaleza",
	RO: "America/Porto_Velho",
	RR: "America/Boa_Vista",
	RS: "America/Sao_Paulo",
	SC: "America/Sao_Paulo",
	SE: "America/Maceio",
	SP: "America/Sao_Paulo",
	TO: "America/Araguaina",
};
