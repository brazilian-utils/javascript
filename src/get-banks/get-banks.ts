import { BANKS, type Bank } from "../_internals/constants/banks";

/**
 * Returns every Brazilian bank with a compensation code (COMPE), published by Banco Central
 * do Brasil in the STR (Sistema de Transferência de Reservas) participants list.
 *
 * Each call returns a fresh array of fresh objects, so mutating the result never affects the
 * underlying data or subsequent calls.
 *
 * @returns {Bank[]} Every known bank, in a fixed table order.
 *
 * @example
 * ```typescript
 * getBanks()[0]; // { code: "001", ispb: "00000000", name: "Banco do Brasil S.A." }
 * ```
 *
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv
 * @see Based on: https://brasilapi.com.br/api/banks/v1 Fallback source used by the dataset
 * generator (`scripts/banks.ts`) when the Bacen CSV request fails.
 */
export const getBanks = (): Bank[] => BANKS.map((bank) => ({ ...bank }));
