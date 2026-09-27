import { BANKS, type Bank } from "../_internals/constants/banks";
import { readLookupDigits } from "../_internals/read-lookup-digits/read-lookup-digits";

export type { Bank } from "../_internals/constants/banks";

const CODE_LENGTH = 3;

/**
 * Looks up a Brazilian bank by its compensation code (COMPE), published by Banco Central do
 * Brasil in the STR (Sistema de Transferência de Reservas) participants list.
 *
 * Whitespace and hyphens are dropped and the code is left padded with zeros, so `1`,
 * `"1"` and `"0-01"` are all `"001"`. Any other character makes the value something other than
 * a code, so `null` is returned instead of having the character stripped: up to 2.4.0 `"1e0"`
 * and `"1.0"` were read as `"010"`.
 *
 * @param {string|number} code - The bank's COMPE code, with or without leading zeros.
 * @returns {Bank|null} A fresh copy of the matching bank, or `null` when no bank has that code.
 *
 * @example
 * ```typescript
 * getBankByCode("001"); // { code: "001", ispb: "00000000", name: "Banco do Brasil S.A." }
 * getBankByCode(1); // { code: "001", ispb: "00000000", name: "Banco do Brasil S.A." }
 * getBankByCode("999"); // null
 * getBankByCode("1e0"); // null (not read as the code 010)
 * ```
 *
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv
 * @see Based on: https://brasilapi.com.br/api/banks/v1
 * Fallback source used by the dataset generator (`scripts/banks.ts`) when the Bacen CSV request fails.
 */
export const getBankByCode = (code: string | number): Bank | null => {
	const digits = readLookupDigits(code);

	// Stryker disable next-line ConditionalExpression: padStart never shortens an oversized code, and no bank has a code longer than 3 digits, so bypassing this half of the guard can never change which bank is found.
	if (digits === null || digits.length > CODE_LENGTH) return null;

	const normalizedCode = digits.padStart(CODE_LENGTH, "0");

	const bank = BANKS.find((candidate) => candidate.code === normalizedCode);

	return bank ? { ...bank } : null;
};
