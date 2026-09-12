import { BANKS, type Bank } from "../_internals/constants/banks";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

const CODE_LENGTH = 3;

/**
 * Looks up a Brazilian bank by its compensation code (COMPE), published by Banco Central do
 * Brasil in the STR (Sistema de Transferência de Reservas) participants list.
 *
 * @param {string|number} code - The bank's COMPE code, with or without leading zeros.
 * @returns {Bank|null} A fresh copy of the matching bank, or `null` when no bank has that code.
 *
 * @example
 * ```typescript
 * getBankByCode("001"); // { code: "001", ispb: "00000000", name: "Banco do Brasil S.A." }
 * getBankByCode(1); // { code: "001", ispb: "00000000", name: "Banco do Brasil S.A." }
 * getBankByCode("999"); // null
 * ```
 *
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv
 * @see Based on: https://brasilapi.com.br/api/banks/v1 Fallback source used by the dataset
 * generator (`scripts/banks.ts`) when the Bacen CSV request fails.
 */
export const getBankByCode = (code: string | number): Bank | null => {
	if (isNullish(code) || (typeof code !== "string" && typeof code !== "number")) return null;

	// Stryker disable next-line EqualityOperator: no institution has COMPE code 000, so 0 and a negative number both resolve to null.
	if (typeof code === "number" && (!Number.isInteger(code) || code < 0)) return null;

	const digits = sanitizeToDigits(code);

	// Stryker disable next-line ConditionalExpression,LogicalOperator: no bank has code "000" and padStart never shortens an oversized code, so bypassing this guard can never change which bank is found.
	if (digits.length === 0 || digits.length > CODE_LENGTH) return null;

	const normalizedCode = digits.padStart(CODE_LENGTH, "0");

	const bank = BANKS.find((candidate) => candidate.code === normalizedCode);

	return bank ? { ...bank } : null;
};
