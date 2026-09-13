export const AMOUNT_DECIMAL_PLACES = 2;

/**
 * The shape the BR Code requires of a transaction amount. `Number#toFixed` falls back to
 * exponential notation from 1e21 upwards (`(1e21).toFixed(2)` is `"1e+21"`), which is short
 * enough to slip past the field length limit, so the formatted amount is matched against this
 * before it is written into the payload.
 */
export const AMOUNT_REGEX = /^\d+\.\d{2}$/;

/**
 * How many characters one TLV object spends besides its value: the 2 digit ID plus the 2 digit
 * length.
 */
export const TLV_OVERHEAD = 4;

/** The characters the Pix manual allows in a `txid`, capped at the 25 the BR Code holds. */
export const TXID_REGEX = /^[A-Za-z0-9]{1,25}$/;
