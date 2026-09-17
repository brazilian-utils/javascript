export type NationalMask = "sn" | "nanp";

/**
 * Every value the `PhoneMask` union of `format-phone.ts` allows, as the set `formatPhone` checks
 * `options.mask` against before it uses it; anything else is not a mask and resolves to
 * `DEFAULT_MASK`. Kept here, out of the mutated sources, next to the masks themselves.
 */
export const PHONE_MASKS: ReadonlySet<unknown> = new Set([
	"auto",
	"e164",
	"international",
	"nanp",
	"service",
	"sn",
]);

/** The mask `formatPhone` applies when `options.mask` is missing or is not a `PhoneMask`. */
export const DEFAULT_MASK = "sn";

/** Length of a bare Brazilian subscriber number, the boundary the `"auto"` mask reads. */
export const SN_LENGTH = 9;

export const MASK: Record<NationalMask, string> = {
	sn: "00000-0000",
	nanp: "(00) 00000-0000",
};

export const NANP_LANDLINE_MASK = "(00) 0000-0000";

export const INTERNATIONAL_PREFIX = "+55";

export const INTERNATIONAL_MASK = {
	landline: "00 0000-0000",
	mobile: "00 00000-0000",
};

export const SERVICE_MASK = {
	abbreviated: "0000-0000",
	nonGeographic: "0000 000 0000",
};
