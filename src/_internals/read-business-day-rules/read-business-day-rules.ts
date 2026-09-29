import { type BusinessDayOptions } from "../../is-business-day/is-business-day";
import { type StateCode } from "../constants/states";
import { readHolidayStateCode } from "../read-holiday-state-code/read-holiday-state-code";

export type BusinessDayRules = {
	/** The state whose holidays count, read and validated, or `undefined` for the national ones. */
	stateCode: StateCode | undefined;
	/** Whether optional holidays count as non-business days. */
	includeOptional: boolean;
	/** Whether Saturday counts as a business day. */
	includeSaturday: boolean;
};

/**
 * Reads the options once into the rules a business day walk applies to every day.
 *
 * @param {BusinessDayOptions|undefined} options - The options given to the business day util.
 * @returns {BusinessDayRules|null} The rules, or `null` when the state code is not a state.
 */
export const readBusinessDayRules = (options?: BusinessDayOptions): BusinessDayRules | null => {
	const stateCode = readHolidayStateCode(options?.stateCode);

	if (stateCode === null) return null;

	return {
		stateCode,
		includeOptional: options?.includeOptional ?? true,
		includeSaturday: options?.includeSaturday ?? false,
	};
};
