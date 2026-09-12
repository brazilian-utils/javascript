export const AMOUNT_DECIMAL_PLACES = 2;

/**
 * How many characters one TLV object spends besides its value: the 2 digit ID plus the 2 digit
 * length.
 */
export const TLV_OVERHEAD = 4;

/** The characters the Pix manual allows in a `txid`, capped at the 25 the BR Code holds. */
export const TXID_REGEX = /^[A-Za-z0-9]{1,25}$/;
