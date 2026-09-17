import { buildBank } from "../_internals/build-bank/build-bank";
import { BANKS, type Bank } from "../_internals/constants/banks";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

export type { Bank } from "../_internals/constants/banks";

const ISPB_LENGTH = 8;

/**
 * Looks up a Brazilian bank by its ISPB (Identificador do Sistema de Pagamentos Brasileiro),
 * the 8 digit code that identifies every participant of the SPB, published by Banco Central do
 * Brasil in the STR (Sistema de Transferência de Reservas) participants list. Every SPB
 * participant has an ISPB, but this dataset only carries the institutions that also have a
 * COMPE code, so an ISPB whose institution has no COMPE code of its own returns `null`.
 *
 * An institution whose COMPE code the list no longer publishes is looked up all the same, because
 * an ISPB read off an old document is exactly the case this lookup answers, and comes back with
 * `legacy: true`. The 463 participants of the current list carry `legacy: false`, and no ISPB is
 * shared between the two groups. Use `getBanks` to list the current ones on their own.
 *
 * @param {string|number} value - The bank's ISPB, with or without leading zeros.
 * @returns {Bank|null} A fresh copy of the matching bank, or `null` when no bank has that ISPB.
 *
 * @example
 * ```typescript
 * getBankByIspb("00000000"); // { code: "001", ispb: "00000000", name: "Banco do Brasil S.A.", legacy: false }
 * getBankByIspb(0); // { code: "001", ispb: "00000000", name: "Banco do Brasil S.A.", legacy: false }
 * getBankByIspb("60701190"); // { code: "341", ispb: "60701190", name: "ITAÚ UNIBANCO S.A.", legacy: false }
 * getBankByIspb("30723886"); // { code: "746", ispb: "30723886", name: "Banco Modal S.A.", legacy: true }
 * getBankByIspb("99999999"); // null
 * ```
 *
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv
 * @see Based on: https://brasilapi.com.br/api/banks/v1
 * Fallback source used by the dataset generator (`scripts/banks.ts`) when the Bacen CSV request fails.
 */
export const getBankByIspb = (value: string | number): Bank | null => {
	if (!isLookupCode(value)) return null;

	const digits = sanitizeToDigits(value);

	// Stryker disable next-line ConditionalExpression: every ISPB in BANKS is exactly 8 digits, so an oversized value can never match one, whether or not this half of the guard runs.
	if (digits.length === 0 || digits.length > ISPB_LENGTH) return null;

	const normalizedIspb = digits.padStart(ISPB_LENGTH, "0");

	const bank = BANKS.find((candidate) => candidate.ispb === normalizedIspb);

	return bank ? buildBank(bank) : null;
};
