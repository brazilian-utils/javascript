import { type Bank } from "../constants/banks";
import { readBanks } from "../read-banks/read-banks";

type BankKey = "code" | "ispb";

const indexes: Partial<Record<BankKey, Map<string, Bank>>> = {};

const buildBankIndex = (key: BankKey): Map<string, Bank> => {
	const index = new Map<string, Bank>();
	const banks = readBanks();

	for (let position = banks.length - 1; position >= 0; position--) {
		index.set(banks[position][key], banks[position]);
	}

	return index;
};

/**
 * Finds the first bank whose `code` or `ispb` equals a value, through an index built on the
 * first lookup of each key.
 *
 * @param {BankKey} key - The bank field to match: `"code"` or `"ispb"`.
 * @param {string} value - The zero-padded value to look for.
 * @returns {Bank|undefined} The bank of the table itself, not a copy, or `undefined` when none matches.
 */
export const findBank = (key: BankKey, value: string): Bank | undefined => {
	indexes[key] ??= buildBankIndex(key);

	return indexes[key].get(value);
};
