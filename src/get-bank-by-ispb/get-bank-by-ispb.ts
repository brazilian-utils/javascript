import { BANKS, type Bank } from "../_internals/constants/banks";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";

export type { Bank } from "../_internals/constants/banks";

const ISPB_LENGTH = 8;

/** Every character that is neither a letter nor a digit, dropped from an ISPB. */
const NON_ALPHANUMERIC_REGEX = /[^\da-z]/gi;

/**
 * Looks up a Brazilian bank by its ISPB (Identificador do Sistema de Pagamentos Brasileiro),
 * the 8 digit code that identifies every participant of the SPB, published by Banco Central do
 * Brasil in the STR (Sistema de Transferência de Reservas) participants list. Every SPB
 * participant has an ISPB, but this dataset only carries the institutions that also have a
 * COMPE code, so an ISPB whose institution has no COMPE code of its own returns `null`.
 *
 * The ISPB is read the way `isValidIban` reads the one inside an IBAN: 8 characters that may be
 * letters as well as digits, since Resolução BCB nº 585/2026 art. 2º III made it "oito
 * caracteres alfanuméricos", upper or lower case. Every character that is neither a letter nor
 * a digit is dropped, as up to 2.4.0 (so the ISPB may be printed with the CNPJ root mask,
 * `"00.000.000"`), and a shorter value is left padded with zeros, so `0` is the ISPB `00000000`.
 * A letter is part of the ISPB, so it is never stripped: up to 2.4.0 `"0000000A"` and
 * `"A0000000"` were read as `00000000`, the ISPB of Banco do Brasil, and a value longer than 8
 * characters finds no ISPB.
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
 * getBankByIspb("0000000A"); // null (no bank has that ISPB, and it is not read as 00000000)
 * ```
 *
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv
 * @see Official: https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?tipo=Resolu%C3%A7%C3%A3o%20BCB&numero=585
 * Resolução BCB nº 585, de 24/08/2026 (DOU 25/08/2026), art. 2º III, the alphanumeric ISPB.
 * @see Based on: https://brasilapi.com.br/api/banks/v1
 * Fallback source used by the dataset generator (`scripts/banks.ts`) when the Bacen CSV request fails.
 */
export const getBankByIspb = (value: string | number): Bank | null => {
	if (!isLookupCode(value)) return null;

	// Stryker disable next-line MethodExpression: no ISPB in BANKS has a letter yet, so a lower case letter misses the table whether or not it is folded to upper case.
	const code = String(value).replaceAll(NON_ALPHANUMERIC_REGEX, "").toUpperCase();

	// An empty value would pad to 00000000, the ISPB of Banco do Brasil.
	if (code === "") return null;

	const ispb = code.padStart(ISPB_LENGTH, "0");
	const bank = BANKS.find((candidate) => candidate.ispb === ispb);

	return bank ? { ...bank } : null;
};
