import { SEPARATORS_REGEX } from "../_internals/constants/separators";
import { STATE_CODES } from "../_internals/constants/state-codes";
import { type StateCode } from "../_internals/constants/states";
import { UF_TO_VOTER_ID_CODE, VOTER_ID_LENGTH } from "../_internals/constants/voter-id";
import { isValidVoterId } from "../is-valid-voter-id/is-valid-voter-id";

export type { StateCode } from "../_internals/constants/states";

/** The fields `getVoterIdInfo` reads out of a voter id (título de eleitor). */
export type VoterIdInfo = {
	/** The 8 digit sequential number, zero padded when the voter id was issued without its leading zeros. */
	sequentialNumber: string;
	/** The 2 digit federative union code (UF), `"01"` to `"28"`. */
	federativeUnion: string;
	/** Two letter code of the state of the federative union, or `null` for `"28"` (ZZ), the voters abroad. */
	stateCode: StateCode | null;
	/** The 2 check digits. */
	checkDigits: string;
};

const SEQUENTIAL_NUMBER_END = 8;
const FEDERATIVE_UNION_END = 10;

/**
 * Reads the fields of a voter id (título de eleitor): the sequential number, the federative union
 * code with the state it stands for, and the 2 check digits.
 *
 * Accepts the same input forms as `isValidVoterId`, masked or not, and returns `null` whenever it
 * would return `false`. A voter id issued without the leading zeros of its sequential number is
 * read as `isValidVoterId` reads it, left padded with zeros to 12 digits, so `sequentialNumber`
 * always has 8 digits.
 *
 * The `federativeUnion` is the code of the table of Resolução TSE nº 23.659/2021, art. 36: `"01"`
 * (SP) to `"27"` (TO), and `"28"` (ZZ) for a voter registered abroad, which has no state, so its
 * `stateCode` is `null`. The code is where the voter first registered, not necessarily where they
 * live today.
 *
 * @param {string} value - The voter id to be read.
 * @returns {VoterIdInfo|null} The fields of the voter id, or `null` when it is not valid.
 *
 * @example
 * ```typescript
 * getVoterIdInfo("1023 8501 06 71");
 * // {
 * //   sequentialNumber: "10238501",
 * //   federativeUnion: "06",
 * //   stateCode: "PR",
 * //   checkDigits: "71",
 * // }
 *
 * getVoterIdInfo("123450159");
 * // { sequentialNumber: "00012345", federativeUnion: "01", stateCode: "SP", checkDigits: "59" }
 *
 * getVoterIdInfo("000000002801");
 * // { sequentialNumber: "00000000", federativeUnion: "28", stateCode: null, checkDigits: "01" }
 *
 * getVoterIdInfo("123456780124"); // null (invalid check digits)
 * ```
 *
 * @see Official: https://www.tse.jus.br/legislacao/compilada/res/2021/resolucao-no-23-659-de-26-de-outubro-de-2021
 * Resolução TSE nº 23.659/2021, art. 36: the sequential number, the table of the federative
 * union codes 01 to 28 and the two check digits.
 * @see Based on: https://github.com/brazilian-utils/python/blob/main/brutils/voter_id.py
 */
export const getVoterIdInfo = (value: string): VoterIdInfo | null => {
	if (!isValidVoterId(value)) return null;

	const digits = value.replace(SEPARATORS_REGEX, "").padStart(VOTER_ID_LENGTH, "0");
	const federativeUnion = digits.slice(SEQUENTIAL_NUMBER_END, FEDERATIVE_UNION_END);

	return {
		sequentialNumber: digits.slice(0, SEQUENTIAL_NUMBER_END),
		federativeUnion,
		stateCode: STATE_CODES.find((state) => UF_TO_VOTER_ID_CODE[state] === federativeUnion) ?? null,
		checkDigits: digits.slice(FEDERATIVE_UNION_END),
	};
};
