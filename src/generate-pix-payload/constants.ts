export const AMOUNT_DECIMAL_PLACES = 2;

/**
 * The shape the BR Code requires of a transaction amount. `Number#toFixed` falls back to
 * exponential notation from 1e21 upwards (`(1e21).toFixed(2)` is `"1e+21"`), which is short
 * enough to slip past the field length limit, so the formatted amount is matched against this
 * before it is written into the payload.
 */
export const AMOUNT_REGEX = /^\d+\.\d{2}$/;

/**
 * How many decimal places the amount is read at when it is checked against the two decimal
 * places actually written. Writing two decimal places rounds anything finer away, so an amount
 * that does not survive the round trip is refused instead of being silently changed; reading it
 * at ten places instead of comparing the two doubles exactly is what lets the representation
 * noise of binary floating point through (`0.1 + 0.2` is `0.30000000000000004`, whose first ten
 * decimal places are still `0.3000000000`), while `0.005` is refused.
 */
export const AMOUNT_COMPARISON_DECIMAL_PLACES = 10;

/**
 * How many characters one TLV object spends besides its value: the 2 digit ID plus the 2 digit
 * length.
 */
export const TLV_OVERHEAD = 4;

/** The characters the Pix manual allows in a `txid`, capped at the 25 the BR Code holds. */
export const TXID_REGEX = /^[A-Za-z0-9]{1,25}$/;
