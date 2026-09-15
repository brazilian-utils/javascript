import { calculateVoterIdFirstDigit } from "../_internals/calculate-voter-id-first-digit/calculate-voter-id-first-digit";
import { calculateVoterIdSecondDigit } from "../_internals/calculate-voter-id-second-digit/calculate-voter-id-second-digit";
import { type StateCode } from "../_internals/constants/states";
import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";
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
const getFederativeUnion = (state: StateCode | "ZZ"): string =>
	typeof state === "string" && Object.hasOwn(UF_TO_VOTER_ID_CODE, state)
		? UF_TO_VOTER_ID_CODE[state]
		: UF_TO_VOTER_ID_CODE.ZZ;

/**
 * Generates a valid random Brazilian voter id (título de eleitor).
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 *
 * @param {StateCode | "ZZ"} state - Optional. The Brazilian state code to generate a voter id
 * for, or `"ZZ"` for a voter id issued abroad. Defaults to `"ZZ"` when omitted or unknown, a key
 * of the prototype chain (`"__proto__"`, `"constructor"`) and a value that is not a string
 * included, so a malformed state never throws.
 * @returns {string} A valid 12-digit voter id string without formatting.
 *
 * @example
 * ```typescript
 * generateVoterId(); // "123456782895" (abroad, UF "28")
 * generateVoterId("SP"); // "123456780191" (UF "01")
 * generateVoterId("XX" as StateCode); // falls back to "ZZ" instead of throwing
 * ```
 *
 * Resolução TSE nº 23.659/2021, art. 36, parágrafo único, confirms the federative union table and
 * the two-step módulo 11 structure; the weights themselves are not published by the TSE and follow
 * the community reference cited as `Based on:`.
 *
 * The TSE resolution page sits behind a bot filter and answers HTTP 403 to every non-browser
 * client, so it has to be opened in a browser.
 *
 * @see Official: https://www.tse.jus.br/legislacao/compilada/res/2021/resolucao-no-23-659-de-26-de-outubro-de-2021
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
