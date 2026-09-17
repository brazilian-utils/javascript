import { buildBank } from "../_internals/build-bank/build-bank";
import { BANKS, type Bank, LEGACY_BANK_CODES } from "../_internals/constants/banks";

export type { Bank } from "../_internals/constants/banks";

/** The object form `getBanks` accepts, saying whether the legacy codes are listed too. */
export type GetBanksParams = {
	/**
	 * Whether the 29 codes the Bacen STR participants list no longer publishes are listed alongside
	 * the 463 it publishes today (default: `false`).
	 */
	includeLegacy?: boolean;
};

/**
 * Returns every Brazilian bank with a compensation code (COMPE), published by Banco Central
 * do Brasil in the STR (Sistema de Transferência de Reservas) participants list.
 *
 * Only the 463 participants of the current list are returned by default, each with
 * `legacy: false`. Pass `{ includeLegacy: true }` to add the 29 codes the list no longer
 * publishes, which come back with `legacy: true` and which `getBankByCode`, `getBankByIspb` and
 * `isValidBankAccount` keep accepting because they still appear in documents filled in while the
 * institution had them.
 *
 * Each call returns a fresh array of fresh objects, so mutating the result never affects the
 * underlying data or subsequent calls.
 *
 * @param {GetBanksParams} [params] - Optional listing options.
 * @param {boolean} [params.includeLegacy] - Whether to add the codes that left the list. Defaults to `false`.
 * @returns {Bank[]} The banks of the current list, plus the legacy ones when asked for, in
 * ascending code order.
 *
 * @example
 * ```typescript
 * getBanks()[0]; // { code: "001", ispb: "00000000", name: "Banco do Brasil S.A.", legacy: false }
 * getBanks().length; // 463
 * getBanks().some((bank) => bank.code === "746"); // false (no longer published)
 * getBanks({ includeLegacy: true }).length; // 492
 * ```
 *
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/str1/ParticipantesSTR.csv
 * @see Based on: https://brasilapi.com.br/api/banks/v1
 * Fallback source used by the dataset generator (`scripts/banks.ts`) when the Bacen CSV request fails.
 */
export const getBanks = (params?: GetBanksParams): Bank[] => {
	const banks =
		params?.includeLegacy === true
			? BANKS
			: BANKS.filter((bank) => !LEGACY_BANK_CODES.includes(bank.code));

	return banks.map((bank) => buildBank(bank));
};
