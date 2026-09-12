import { BANKS, type Bank } from "../_internals/constants/banks";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

const ISPB_LENGTH = 8;

/**
 * Looks up a Brazilian bank by its ISPB (Identificador do Sistema de Pagamentos Brasileiro),
 * the 8 digit code that identifies every participant of the SPB, published by Banco Central do
 * Brasil in the STR (Sistema de Transferência de Reservas) participants list. Unlike the COMPE
 * code (`getBankByCode`), every SPB participant has an ISPB, including institutions with no
 * COMPE code of their own.
 *
 * @param {string|number} value - The bank's ISPB, with or without leading zeros.
 * @returns {Bank|null} A fresh copy of the matching bank, or `null` when no bank has that ISPB.
 *
 * @example
 * ```typescript
 * getBankByIspb("00000000"); // { code: "001", ispb: "00000000", name: "Banco do Brasil S.A." }
 * getBankByIspb(0); // { code: "001", ispb: "00000000", name: "Banco do Brasil S.A." }
 * getBankByIspb("60701190"); // { code: "341", ispb: "60701190", name: "ITAÚ UNIBANCO S.A." }
 * getBankByIspb("99999999"); // null
 * ```
 *
 * @see Official: https://www.bcb.gov.br/pom/spb/estatistica/port/ParticipantesSTRport.csv
 * @see Based on: https://brasilapi.com.br/api/banks/v1 Fallback source used by the dataset
 * generator (`scripts/banks.ts`) when the Bacen CSV request fails.
 */
export const getBankByIspb = (value: string | number): Bank | null => {
	if (isNullish(value) || (typeof value !== "string" && typeof value !== "number")) return null;

	if (typeof value === "number" && (!Number.isInteger(value) || value < 0)) return null;

	const digits = sanitizeToDigits(value);

	// Stryker disable next-line ConditionalExpression: every ISPB in BANKS is exactly 8 digits, so an oversized value can never match one, whether or not this half of the guard runs.
	if (digits.length === 0 || digits.length > ISPB_LENGTH) return null;

	const normalizedIspb = digits.padStart(ISPB_LENGTH, "0");

	const bank = BANKS.find((candidate) => candidate.ispb === normalizedIspb);

	return bank ? { ...bank } : null;
};
