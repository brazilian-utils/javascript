import {
	PIX_ADDITIONAL_DATA_ID,
	PIX_COUNTRY_CODE,
	PIX_COUNTRY_CODE_ID,
	PIX_CRC_FIELD_LENGTH,
	PIX_CRC_LENGTH,
	PIX_CRC_TAG,
	PIX_DYNAMIC_POINT_OF_INITIATION,
	PIX_KEY_ID,
	PIX_MERCHANT_CATEGORY_CODE_ID,
	PIX_MERCHANT_CITY_ID,
	PIX_MERCHANT_NAME_ID,
	PIX_PAYLOAD_FORMAT_INDICATOR,
	PIX_PAYLOAD_FORMAT_INDICATOR_ID,
	PIX_POINT_OF_INITIATION_ID,
	PIX_STATIC_POINT_OF_INITIATION,
	PIX_TRANSACTION_AMOUNT_ID,
	PIX_TRANSACTION_AMOUNT_MAX_LENGTH,
	PIX_TRANSACTION_CURRENCY,
	PIX_TRANSACTION_CURRENCY_ID,
	PIX_URL_ID,
	PIX_WITHDRAWAL_FACILITATOR_ID,
} from "../_internals/constants/pix";
import { crc16Ccitt } from "../_internals/crc16-ccitt/crc16-ccitt";
import { findPixMerchantAccountInformation } from "../_internals/find-pix-merchant-account-information/find-pix-merchant-account-information";
import { isValidPixUrl } from "../_internals/is-valid-pix-url/is-valid-pix-url";
import { type TlvFields, parseTlv } from "../_internals/parse-tlv/parse-tlv";

const AMOUNT_REGEX = /^\d+(?:\.\d{1,2})?$/;

const WITHDRAWAL_FACILITATOR_REGEX = /^\d{8}$/;

const isValidCrc = (payload: string): boolean => {
	const checksum = payload.slice(-PIX_CRC_LENGTH);

	if (payload.slice(-PIX_CRC_FIELD_LENGTH, -PIX_CRC_LENGTH) !== PIX_CRC_TAG) return false;

	// A checksum that is not four uppercase hexadecimal digits can never equal crc16Ccitt's
	// always-hexadecimal output, so the comparison below turns it down on its own.
	return crc16Ccitt(payload.slice(0, -PIX_CRC_LENGTH)) === checksum.toUpperCase();
};

const isValidPointOfInitiation = (fields: TlvFields): boolean => {
	const pointOfInitiation = fields[PIX_POINT_OF_INITIATION_ID];

	return (
		pointOfInitiation === undefined ||
		pointOfInitiation === PIX_STATIC_POINT_OF_INITIATION ||
		pointOfInitiation === PIX_DYNAMIC_POINT_OF_INITIATION
	);
};

const isFilled = (value: string | undefined): boolean => value !== undefined && value !== "";

const isValidMerchantAccountInformation = (merchantAccountInformation: TlvFields): boolean => {
	const key = merchantAccountInformation[PIX_KEY_ID];
	const url = merchantAccountInformation[PIX_URL_ID];
	const withdrawalFacilitator = merchantAccountInformation[PIX_WITHDRAWAL_FACILITATOR_ID];

	if ((key === undefined) === (url === undefined)) return false;
	if (key !== undefined && !key) return false;
	if (url !== undefined && !isValidPixUrl(url)) return false;
	if (withdrawalFacilitator !== undefined && url !== undefined) return false;

	return (
		withdrawalFacilitator === undefined || WITHDRAWAL_FACILITATOR_REGEX.test(withdrawalFacilitator)
	);
};

const isValidAmount = (
	amount: string | undefined,
	merchantAccountInformation: TlvFields,
): boolean => {
	if (amount === undefined) return true;

	if (!AMOUNT_REGEX.test(amount) || amount.length > PIX_TRANSACTION_AMOUNT_MAX_LENGTH) return false;

	return (
		merchantAccountInformation[PIX_URL_ID] !== undefined ||
		merchantAccountInformation[PIX_WITHDRAWAL_FACILITATOR_ID] !== undefined ||
		Number(amount) > 0
	);
};

const isValidAdditionalData = (additionalData: string | undefined): boolean =>
	additionalData === undefined || parseTlv(additionalData) !== null;

/**
 * Validates a Pix BR Code payload, the string behind a Pix QR Code and behind "Pix copia e
 * cola".
 *
 * The payload is valid when its TLV (tag-length-value) structure is well-formed, when the
 * mandatory objects are present and well-formed (payload format indicator `01`, merchant
 * category code, currency `986`, country `BR`, merchant name and merchant city), when one of
 * the "Merchant Account Information" templates (IDs 26 to 51) carries the `br.gov.bcb.pix` GUI
 * together with a key (static QR Code) or a URL (dynamic QR Code), and when the CRC-16 matches
 * the rest of the payload. The "Point of Initiation Method" object (`01`) is advisory: the
 * Manual do BR Code marks it `Uso: O` and only assigns a meaning to the value `"12"`, so it may
 * be absent from either shape and only a value outside `{"11", "12"}` makes the payload
 * invalid. A payload built around a key that states a transaction amount (`54`) must state one
 * greater than zero, unless it is a Pix Saque BR Code, i.e. unless it carries the ISPB of the
 * "facilitador de serviço de saque" in sub-object 26-03 (`fss`) as §2.6 of the Pix manual
 * prescribes; rejecting `"0"`/`"0.00"` without `fss` is a deliberate restriction of this
 * library, not a rule of the manual. A `fss` written next to a PSP location makes the payload
 * invalid: §2.7 of the Manual de Padrões para Iniciação do Pix maps the dynamic QR Code to
 * exactly two sub-objects, `00` (GUI) and `25` (URL), and `fss` belongs to the static template
 * of §2.6.
 *
 * The key itself is not checked against the DICT formats: the manual states a static QR Code
 * can be generated with a key that is not (or is no longer) registered, so use `isValidPixKey`
 * when that matters.
 *
 * Unreserved Templates (IDs 80 to 99) are ignored. The "QR Code composto" of Pix Automático
 * (Pix recorrente) writes its recurrence location in one of them: when such a payload also
 * carries a payment location in 26-25, as the composite example of the Pix manual does, it is
 * accepted here and read as an ordinary dynamic payload, its recurrence location dropped. Only
 * a payload with no Pix template at all in IDs 26 to 51 is reported as invalid.
 *
 * @param {string} value - The BR Code payload to validate.
 * @returns {boolean} True if the payload is a valid Pix BR Code, false otherwise.
 *
 * @example
 * ```typescript
 * isValidPixPayload(
 *   "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000" +
 *     "5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D",
 * ); // true
 *
 * isValidPixPayload("00020126580014br.gov.bcb.pix..."); // false (broken CRC)
 * ```
 *
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
 * @see Official: https://github.com/bacen/pix-api
 * Pix (SPI) OpenAPI spec.
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html
 * DICT (Diretório de Identificadores de Contas Transacionais) API specification.
 */
export const isValidPixPayload = (value: string): boolean => {
	if (typeof value !== "string") return false;

	const payload = value.trim();

	// Stryker disable next-line ConditionalExpression,EqualityOperator: a payload this short has no room left for any of the mandatory fields checked below, so it can never be valid even without this guard
	if (payload.length <= PIX_CRC_FIELD_LENGTH || !isValidCrc(payload)) return false;

	const fields = parseTlv(payload);

	if (!fields) return false;

	if (fields[PIX_PAYLOAD_FORMAT_INDICATOR_ID] !== PIX_PAYLOAD_FORMAT_INDICATOR) return false;
	if (!isValidPointOfInitiation(fields)) return false;
	if (fields[PIX_MERCHANT_CATEGORY_CODE_ID] === undefined) return false;
	if (fields[PIX_TRANSACTION_CURRENCY_ID] !== PIX_TRANSACTION_CURRENCY) return false;
	if (fields[PIX_COUNTRY_CODE_ID]?.toUpperCase() !== PIX_COUNTRY_CODE) return false;
	if (!isFilled(fields[PIX_MERCHANT_NAME_ID])) return false;
	if (!isFilled(fields[PIX_MERCHANT_CITY_ID])) return false;

	const merchantAccountInformation = findPixMerchantAccountInformation(fields);

	if (!merchantAccountInformation) return false;
	if (!isValidMerchantAccountInformation(merchantAccountInformation)) return false;
	if (!isValidAmount(fields[PIX_TRANSACTION_AMOUNT_ID], merchantAccountInformation)) return false;

	return isValidAdditionalData(fields[PIX_ADDITIONAL_DATA_ID]);
};
