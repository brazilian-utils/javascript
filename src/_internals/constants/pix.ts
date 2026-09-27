/**
 * BR Code (EMV® QRCPS-MPM) field identifiers and Pix specific limits shared by the Pix
 * utilities.
 *
 * The payload is a flat list of TLV objects: a 2 digit ID, a 2 digit length and a value of
 * exactly that length. The Pix arrangement lives in one of the "Merchant Account Information"
 * templates (IDs 26 to 51), the one whose GUI (sub-object `00`) is `br.gov.bcb.pix`.
 *
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
 */

export const PIX_GUI = "br.gov.bcb.pix";

export const PIX_PAYLOAD_FORMAT_INDICATOR_ID = "00";

export const PIX_PAYLOAD_FORMAT_INDICATOR = "01";

/**
 * The Payload Format Indicator object as the EMV® QRCPS-MPM requires it at the very start of
 * the payload: "The Payload Format Indicator (ID "00") shall be the first data object in the QR
 * Code".
 */
export const PIX_PAYLOAD_FORMAT_INDICATOR_OBJECT = "000201";

export const PIX_POINT_OF_INITIATION_ID = "01";

export const PIX_STATIC_POINT_OF_INITIATION = "11";

export const PIX_DYNAMIC_POINT_OF_INITIATION = "12";

export const PIX_MERCHANT_ACCOUNT_INFORMATION_ID = "26";

export const PIX_MERCHANT_ACCOUNT_INFORMATION_FIRST_ID = 26;

export const PIX_MERCHANT_ACCOUNT_INFORMATION_LAST_ID = 51;

export const PIX_MERCHANT_ACCOUNT_INFORMATION_MAX_LENGTH = 99;

export const PIX_GUI_ID = "00";

export const PIX_KEY_ID = "01";

export const PIX_DESCRIPTION_ID = "02";

export const PIX_WITHDRAWAL_FACILITATOR_ID = "03";

export const PIX_URL_ID = "25";

export const PIX_MERCHANT_CATEGORY_CODE_ID = "52";

export const PIX_MERCHANT_CATEGORY_CODE = "0000";

/**
 * The Merchant Category Code (ID `52`) is a numeric (`N`) object of length `04` in the EMV®
 * QRCPS-MPM, a code of ISO 18245; the Pix manual writes `0000` ("não informado") in its examples.
 */
export const PIX_MERCHANT_CATEGORY_CODE_REGEX = /^\d{4}$/;

export const PIX_TRANSACTION_CURRENCY_ID = "53";

export const PIX_TRANSACTION_CURRENCY = "986";

export const PIX_TRANSACTION_AMOUNT_ID = "54";

export const PIX_TRANSACTION_AMOUNT_MAX_LENGTH = 13;

export const PIX_COUNTRY_CODE_ID = "58";

export const PIX_COUNTRY_CODE = "BR";

export const PIX_MERCHANT_NAME_ID = "59";

export const PIX_MERCHANT_NAME_MAX_LENGTH = 25;

export const PIX_MERCHANT_CITY_ID = "60";

export const PIX_MERCHANT_CITY_MAX_LENGTH = 15;

export const PIX_ADDITIONAL_DATA_ID = "62";

export const PIX_TXID_ID = "05";

export const PIX_ABSENT_TXID = "***";

/**
 * A `txid` (62-05): "limitado a 25 caracteres", of the letters `a`-`z` and `A`-`Z` and the digits
 * `0`-`9` (Manual de Padrões para Iniciação do Pix, §2.6.2).
 */
export const PIX_TXID_REGEX = /^[A-Za-z0-9]{1,25}$/;

export const PIX_CRC_TAG = "6304";

export const PIX_CRC_LENGTH = 4;

export const PIX_URL_MAX_LENGTH = 77;

export const PIX_DESCRIPTION_MAX_LENGTH = 72;
