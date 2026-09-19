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

/** The patterns `formatPhone` reads, one set for the plain output and one for the obfuscated. */
export type PhoneMasks = {
	/** The patterns of the `"sn"` and `"nanp"` masks. */
	national: Record<NationalMask, string>;
	/** The `"nanp"` pattern of a 10 digit landline. */
	nanpLandline: string;
	/** The patterns of the `"international"` mask, without the `+55` prefix. */
	international: PhoneLineMasks;
	/** The patterns of the `"service"` mask. */
	service: PhoneServiceMasks;
};

/** One pattern per kind of line, picked by the number of digits. */
export type PhoneLineMasks = {
	/** DDD + 8 digits. */
	landline: string;
	/** DDD + 9 digits. */
	mobile: string;
};

/** One pattern per family of service number. */
export type PhoneServiceMasks = {
	/** The `300X`/`400X` numbers. */
	abbreviated: string;
	/** The Códigos Não Geográficos (`0300`, `0303`, `0500`, `0800`, `0900`). */
	nonGeographic: string;
};

export const MASKS: PhoneMasks = {
	national: {
		sn: "00000-0000",
		nanp: "(00) 00000-0000",
	},
	nanpLandline: "(00) 0000-0000",
	international: {
		landline: "00 0000-0000",
		mobile: "00 00000-0000",
	},
	service: {
		abbreviated: "0000-0000",
		nonGeographic: "0000 000 0000",
	},
};

/**
 * The gov.br account (acesso.gov.br) shows the registered mobile as "*********00": only the last
 * 2 digits stay visible. These patterns keep that count and also keep the prefix that names a
 * region or a service instead of a subscriber, the DDD, the `0800`-like code or the `300X`/`400X`
 * root, e.g. "(11) *****-**21", "+55 11 ****-**00", "0800 *** **67" and "4004-**34".
 */
export const OBFUSCATED_MASKS: PhoneMasks = {
	national: {
		sn: "*****-**00",
		nanp: "(00) *****-**00",
	},
	nanpLandline: "(00) ****-**00",
	international: {
		landline: "00 ****-**00",
		mobile: "00 *****-**00",
	},
	service: {
		abbreviated: "0000-**00",
		nonGeographic: "0000 *** **00",
	},
};

/** The obfuscated `"e164"` patterns, without the `+55` prefix: the plain output has no pattern. */
export const OBFUSCATED_E164_MASK: PhoneLineMasks = {
	landline: "00******00",
	mobile: "00*******00",
};

export const INTERNATIONAL_PREFIX = "+55";
