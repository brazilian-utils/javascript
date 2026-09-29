import { COMPE_CODES } from "../constants/bank-codes";
import { type Bank, BANK_ISPBS, BANK_NAMES } from "../constants/banks";
import { readCodeTable } from "../read-code-table/read-code-table";

const ISPB_LENGTH = 8;

let cache: readonly Bank[] | undefined;

/**
 * Reads every bank, in ascending order of compensation code, out of `COMPE_CODES`, `BANK_ISPBS`
 * and `BANK_NAMES`. The banks are read on the first call and the same array of the same objects
 * is handed back after that, so a caller must copy a bank before handing it out.
 *
 * @returns {readonly Bank[]} The bank of each compensation code.
 *
 * @example
 * ```typescript
 * readBanks()[0]; // { code: "001", ispb: "00000000", name: "Banco do Brasil S.A." }
 * ```
 */
export const readBanks = (): readonly Bank[] => {
	if (cache !== undefined) return cache;

	const { width, values } = readCodeTable(COMPE_CODES);
	const names = BANK_NAMES.split("\n");
	const banks = values.map((value, index) => ({
		code: String(value).padStart(width, "0"),
		ispb: BANK_ISPBS.slice(index * ISPB_LENGTH, (index + 1) * ISPB_LENGTH),
		name: names[index],
	}));

	cache = banks;

	return banks;
};
