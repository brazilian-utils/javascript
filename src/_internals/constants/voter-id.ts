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
