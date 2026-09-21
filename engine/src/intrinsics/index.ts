/** Loads every intrinsic module, so importing this file populates the registry. */

import "./strings.ts";
import "./numbers.ts";
import "./sequences.ts";
import "./decimals.ts";
import "./dates.ts";
import "./capabilities.ts";
import "./regexes.ts";
import "./options.ts";

export { allIntrinsics, lookupIntrinsic, SignatureError, DomainFailure } from "./registry.ts";
export type { EvalContext, IntrinsicDef } from "./registry.ts";
export { BUILTIN_ERRORS, BUILTIN_RECORDS, builtinRecord } from "./builtins.ts";
export type { RecordDef } from "./builtins.ts";
export { ROUNDING_MODES, roundQuotient, floatToRational } from "./decimals.ts";
export {
	epochDaysFromYmd,
	ymdFromEpochDays,
	isValidYmd,
	MIN_EPOCH_DAY,
	MAX_EPOCH_DAY,
} from "./dates.ts";
export { TRIM_CODE_POINTS } from "./strings.ts";
