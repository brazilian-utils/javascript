/** Digits of a "cobrança bancária" linha digitável. */
export const BOLETO_LENGTH = 47;

/** Digits of a "cobrança bancária" barcode (código de barras). */
export const BOLETO_BARCODE_LENGTH = 44;

/**
 * The código de moeda of a "cobrança bancária" slip in real, `9`: Carta-Circular BCB nº
 * 2.926/2000 sets it in position 4 of the barcode, which is position 4 of the linha digitável
 * too, since campo 1 opens with the first 4 barcode digits. `generateBoleto` writes it.
 */
export const REAL_CURRENCY_CODE = "9";

/**
 * The prefix of a slip of the FEBRABAN Convenção da Cobrança item 2.3.2, "Situação 2", issued by
 * an institution identified only by its ISPB: "Número Código 988" in positions 1 to 3, "Zero" as
 * the código de moeda in position 4, and "Zeros" as the fator de vencimento in positions 6 to 9.
 * Positions 10 to 19 carry the "ISPB com zeros a esquerda" instead of an amount.
 */
export const ISPB_ONLY_PREFIX = "9880";

/**
 * What an `ISPB_ONLY_PREFIX` slip carries from `FACTOR_INDEX` on: the "Zeros" fator de vencimento
 * and the 2 zeros that pad the 8 digit ISPB to the 10 digits of positions 10 to 19.
 */
export const ISPB_ONLY_ZEROS = "000000";

/** Index (0 based) of the fator de vencimento in the linha digitável. */
export const FACTOR_INDEX = 33;

/** Index (0 based) of the amount in the linha digitável. */
export const AMOUNT_INDEX = 37;

/** Digits of the fator de vencimento. */
export const FACTOR_LENGTH = 4;

/** Digits of the amount, positions 10 to 19 of the barcode. */
export const AMOUNT_LENGTH = 10;

/** Digits of the ISPB of an `ISPB_ONLY_PREFIX` slip. */
export const ISPB_LENGTH = 8;

/** Index (0 based) of the fator de vencimento in the barcode, positions 6 to 9. */
export const BARCODE_FACTOR_INDEX = 5;

/** Index (0 based) of the amount in the barcode, positions 10 to 19. */
export const BARCODE_AMOUNT_INDEX = 9;

/** Index (0 based) of the 8 digit ISPB of an `ISPB_ONLY_PREFIX` slip in the barcode. */
export const BARCODE_ISPB_INDEX = 11;

/** Index (0 based) of the 8 digit ISPB of an `ISPB_ONLY_PREFIX` slip in the linha digitável. */
export const ISPB_INDEX = 39;

/** Index (0 based) of the código de moeda in the barcode and in the linha digitável. */
export const CURRENCY_CODE_INDEX = 3;
