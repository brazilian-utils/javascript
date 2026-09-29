import { calculateVoterIdFirstDigit } from "../_internals/calculate-voter-id-first-digit/calculate-voter-id-first-digit";
import { calculateVoterIdSecondDigit } from "../_internals/calculate-voter-id-second-digit/calculate-voter-id-second-digit";
import { type StateCode } from "../_internals/constants/states";
import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";
import { hasOwnKey } from "../_internals/has-own-key/has-own-key";
import { normalizeStateCode } from "../_internals/read-state-code/read-state-code";
import { UF_TO_VOTER_ID_CODE } from "../is-valid-voter-id/constants";

export type { StateCode } from "../_internals/constants/states";

/**
 * The federative union code of a state, `"ZZ"`'s own code for anything else. The lookup is an own
 * property one, so a key of the prototype chain (`"__proto__"`, `"constructor"`, `"toString"`)
 * resolves as an unknown state instead of reaching `Object.prototype` and handing a function or an
 * object to the check digit calculation.
 *
 * @param {StateCode | "ZZ"} state - The state the voter id is generated for.
 * @returns {string} The two digit federative union code of that state, or `"ZZ"`'s own code.
 */
const getFederativeUnion = (state: StateCode | "ZZ"): string => {
	const code = normalizeStateCode(state);

	return hasOwnKey(UF_TO_VOTER_ID_CODE, code) ? UF_TO_VOTER_ID_CODE[code] : UF_TO_VOTER_ID_CODE.ZZ;
};

/**
 * Generates a valid random Brazilian voter id (título de eleitor).
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 *
 * @param {StateCode | "ZZ"} state - Optional. The Brazilian state code to generate a voter id
 * for, or `"ZZ"` for a voter id issued abroad, letter case and surrounding whitespace ignored
 * (`"sp"` is `"SP"`). Defaults to `"ZZ"` when omitted or unknown, a key
 * of the prototype chain (`"__proto__"`, `"constructor"`) and a value that is not a string
 * included, so a malformed state never throws.
 * @returns {string} A valid 12-digit voter id string without formatting, leading zeros kept.
 *
 * @example
 * ```typescript
 * generateVoterId(); // "123456782895" (abroad, UF "28")
 * generateVoterId("SP"); // "123456780191" (UF "01")
 * generateVoterId("XX" as StateCode); // falls back to "ZZ" instead of throwing
 * ```
 *
 * The 8-digit sequential number is always returned with its leading zeros, so the result has 12
 * digits. The TSE drops those zeros when it issues a voter id; the same id without them (e.g.
 * "123450159" for "000123450159") is accepted by `isValidVoterId` too, and `parseVoterId` keeps
 * whichever form it is given.
 *
 * Resolução TSE nº 23.659/2021, art. 36, confirms the structure ("composto por até 12 algarismos",
 * the first eight sequential), the federative union table and the two-step módulo 11 structure;
 * the weights themselves and the São Paulo and Minas Gerais remainder rule have no official
 * source (the resolution, like the Resolução TSE nº 21.538/2003 it revoked, says only "Módulo
 * 11") and follow the community reference cited as `Based on:`.
 *
 * The TSE resolution page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser.
 *
 * @see Official: https://www.tse.jus.br/legislacao/compilada/res/2021/resolucao-no-23-659-de-26-de-outubro-de-2021
 * Resolução TSE nº 23.659/2021, art. 36: "os oito primeiros algarismos serão sequenciados,
 * desprezando-se, na emissão, os zeros à esquerda".
 * @see Based on: https://siga0984.wordpress.com/2019/05/01/algoritmos-validacao-de-titulo-de-eleitor/
 */
export const generateVoterId = (
	// Stryker disable next-line StringLiteral: any default other than a valid key still falls through the ?? UF_TO_VOTER_ID_CODE.ZZ lookup below, so the literal default value is unobservable.
	state: StateCode | "ZZ" = "ZZ",
): string => {
	const federativeUnion = getFederativeUnion(state);
	const sequentialNumber = generateRandomNumber(8);
	const digit1 = calculateVoterIdFirstDigit({ sequentialNumber, federativeUnion });
	const digit2 = calculateVoterIdSecondDigit({ federativeUnion, firstDigit: digit1 });

	return `${sequentialNumber}${federativeUnion}${digit1}${digit2}`;
};
