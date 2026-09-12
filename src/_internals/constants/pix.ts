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

export const PIX_URL_ID = "25";

export const PIX_MERCHANT_CATEGORY_CODE_ID = "52";

export const PIX_MERCHANT_CATEGORY_CODE = "0000";

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

export const PIX_CRC_TAG = "6304";

export const PIX_CRC_LENGTH = 4;

export const PIX_KEY_MAX_LENGTH = 77;

export const PIX_URL_MAX_LENGTH = 77;

export const PIX_DESCRIPTION_MAX_LENGTH = 72;
