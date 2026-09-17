import { type Bank, LEGACY_BANK_CODES } from "../constants/banks";

/**
 * Builds the bank a lookup hands out from a row of the Bacen STR participants table: a fresh copy
 * of the row plus `legacy`, which is `true` when the list no longer publishes the code.
 *
 * The flag is derived here instead of being stored on every row, so the shipped table weighs what
 * the data itself weighs and a dataset refresh never has to restate it.
 *
 * @param {Omit<Bank, "legacy">} bank - The table row to build the bank from.
 * @returns {Bank} A fresh bank object, with the `legacy` flag of its code.
 *
 * @example
 * ```typescript
 * buildBank({ code: "001", ispb: "00000000", name: "Banco do Brasil S.A." });
 * // { code: "001", ispb: "00000000", name: "Banco do Brasil S.A.", legacy: false }
 * buildBank({ code: "746", ispb: "30723886", name: "Banco Modal S.A." });
 * // { code: "746", ispb: "30723886", name: "Banco Modal S.A.", legacy: true }
 * ```
 */
export const buildBank = (bank: Omit<Bank, "legacy">): Bank => ({
	...bank,
	legacy: LEGACY_BANK_CODES.includes(bank.code),
});
