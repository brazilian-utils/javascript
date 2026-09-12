import {
	PIX_ABSENT_TXID,
	PIX_ADDITIONAL_DATA_ID,
	PIX_COUNTRY_CODE,
	PIX_COUNTRY_CODE_ID,
	PIX_CRC_LENGTH,
	PIX_CRC_TAG,
	PIX_DESCRIPTION_ID,
	PIX_DYNAMIC_POINT_OF_INITIATION,
	PIX_GUI,
	PIX_GUI_ID,
	PIX_KEY_ID,
	PIX_MERCHANT_ACCOUNT_INFORMATION_FIRST_ID,
	PIX_MERCHANT_ACCOUNT_INFORMATION_LAST_ID,
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
	PIX_TXID_ID,
	PIX_URL_ID,
} from "../_internals/constants/pix";
import { crc16Ccitt } from "../_internals/crc16-ccitt/crc16-ccitt";
import { isValidPixUrl } from "../_internals/is-valid-pix-url/is-valid-pix-url";
import { type TlvFields, parseTlv } from "../_internals/parse-tlv/parse-tlv";

export type PixPointOfInitiation = "static" | "dynamic";

export type PixPayload = {
	/** The Pix key of the receiver, present in a static payload. */
	key?: string;
	/** URL of the dynamic payload, present instead of `key` in a dynamic one. */
	url?: string;
	/** Free text the receiver wrote for the payer. */
	description?: string;
	/** Name of the receiver, at most 25 ASCII characters. */
	merchantName: string;
	/** City of the receiver, at most 15 ASCII characters. */
	merchantCity: string;
	/** Amount in BRL, absent when the payer types it. */
	amount?: number;
	/** Transaction ID, absent when the payload carries the `***` marker. */
	txid?: string;
	/** Whether the payload may be paid once ("dynamic") or many times ("static"). */
	pointOfInitiation?: PixPointOfInitiation;
};

// Stryker disable next-line Regex: this is only ever tested against `checksum`, a slice of exactly PIX_CRC_LENGTH (4) characters, so dropping either anchor cannot change whether it matches
const CRC_VALUE_REGEX = /^[0-9a-f]{4}$/i;

const AMOUNT_REGEX = /^\d+(?:\.\d{1,2})?$/;

const CRC_TAG_LENGTH = PIX_CRC_TAG.length + PIX_CRC_LENGTH;

const findMerchantAccountInformation = (fields: TlvFields): TlvFields | null => {
	for (
		let id = PIX_MERCHANT_ACCOUNT_INFORMATION_FIRST_ID;
		id <= PIX_MERCHANT_ACCOUNT_INFORMATION_LAST_ID;
		id++
	) {
		const template = fields[id.toString()];

		if (template === undefined) continue;

		const objects = parseTlv(template);

		if (objects?.[PIX_GUI_ID]?.toLowerCase() === PIX_GUI) return objects;
	}

	return null;
};

const isValidCrc = (payload: string): boolean => {
	const checksum = payload.slice(-PIX_CRC_LENGTH);

	if (payload.slice(-CRC_TAG_LENGTH, -PIX_CRC_LENGTH) !== PIX_CRC_TAG) return false;

	// Stryker disable next-line ConditionalExpression: a checksum that fails this hex check can never equal crc16Ccitt's always-hex output, so the final comparison below already rejects it on its own
	if (!CRC_VALUE_REGEX.test(checksum)) return false;

	return crc16Ccitt(payload.slice(0, -PIX_CRC_LENGTH)) === checksum.toUpperCase();
};

const resolvePointOfInitiation = (fields: TlvFields): string | undefined | null => {
	const pointOfInitiation = fields[PIX_POINT_OF_INITIATION_ID];

	if (
		pointOfInitiation !== undefined &&
		pointOfInitiation !== PIX_STATIC_POINT_OF_INITIATION &&
		pointOfInitiation !== PIX_DYNAMIC_POINT_OF_INITIATION
	) {
		return null;
	}

	return pointOfInitiation;
};

const isValidAmount = (amount: string | undefined): boolean =>
	amount === undefined ||
	(AMOUNT_REGEX.test(amount) && amount.length <= PIX_TRANSACTION_AMOUNT_MAX_LENGTH);

type MerchantKeyInfo = {
	key?: string | undefined;
	url?: string | undefined;
	description?: string | undefined;
};

const resolveMerchantKeyInfo = (fields: TlvFields): MerchantKeyInfo | null => {
	const merchantAccountInformation = findMerchantAccountInformation(fields);

	if (!merchantAccountInformation) return null;

	const key = merchantAccountInformation[PIX_KEY_ID];
	const url = merchantAccountInformation[PIX_URL_ID];
	const description = merchantAccountInformation[PIX_DESCRIPTION_ID];

	if ((key === undefined) === (url === undefined)) return null;
	if (key !== undefined && !key) return null;
	if (url !== undefined && !isValidPixUrl(url)) return null;

	return { key, url, description };
};

const resolveTxid = (fields: TlvFields): string | undefined | null => {
	const additionalData = fields[PIX_ADDITIONAL_DATA_ID];

	if (additionalData === undefined) return undefined;

	const objects = parseTlv(additionalData);

	if (!objects) return null;

	return objects[PIX_TXID_ID];
};

type OptionalPixFields = {
	key?: string | undefined;
	url?: string | undefined;
	description?: string | undefined;
	amount?: string | undefined;
	txid?: string | undefined;
	pointOfInitiation?: string | undefined;
};

const buildPixPayload = (
	merchantName: string,
	merchantCity: string,
	optional: OptionalPixFields,
): PixPayload => {
	const { key, url, description, amount, txid, pointOfInitiation } = optional;
	const pix: PixPayload = { merchantName, merchantCity };

	if (key !== undefined) pix.key = key;
	if (url !== undefined) pix.url = url;
	if (description !== undefined) pix.description = description;

	const isDynamic = pointOfInitiation === PIX_DYNAMIC_POINT_OF_INITIATION;

	if (amount !== undefined && !isDynamic) pix.amount = Number(amount);
	if (txid !== undefined && txid !== PIX_ABSENT_TXID && !isDynamic) pix.txid = txid;

	if (pointOfInitiation !== undefined) {
		pix.pointOfInitiation =
			pointOfInitiation === PIX_DYNAMIC_POINT_OF_INITIATION ? "dynamic" : "static";
	}

	return pix;
};

/**
 * Parses a Pix BR Code payload, the string behind a Pix QR Code and behind "Pix copia e cola".
 *
 * The payload is rejected when its TLV (tag-length-value) structure is malformed, when the CRC
 * does not match, when a mandatory object is missing or malformed, or when none of the
 * "Merchant Account Information" templates (IDs 26 to 51) carries the `br.gov.bcb.pix` GUI
 * together with either a key (static) or a URL (dynamic).
 *
 * The Pix key itself is not validated: the manual states a static QR Code can be generated
 * with a key that no longer exists in the DICT, so key ownership is only settled at payment
 * time. The "Additional Data Field Template" (ID 62) is mandatory in the BR Code table but
 * optional in the EMV® specification it refers to, so it is accepted when absent. The lengths
 * the manual reserves for the merchant name (25), the merchant city (15) and the `txid` (25)
 * are generator side limits, enforced by `generatePixPayload`; payloads in the wild routinely
 * overrun them, so they are not enforced here.
 *
 * The merchant account information must carry exactly one of a Pix key (26-01) or a PSP
 * location (26-25); the location is checked with the same host and path rule
 * `generatePixPayload` applies. In a dynamic payload the transaction amount (54) and the
 * `txid` (62-05) are ignored, as the manual mandates, because the PSP location is the source
 * of truth for both.
 *
 * @param {string} value - The BR Code payload to be parsed.
 * @returns {PixPayload|null} The Pix data of the payload, or `null` when it is not a valid Pix
 * BR Code.
 *
 * @example
 * ```typescript
 * parsePixPayload(
 *   "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000" +
 *     "5204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D",
 * );
 * // {
 * //   key: "123e4567-e12b-12d1-a456-426655440000",
 * //   merchantName: "Fulano de Tal",
 * //   merchantCity: "BRASILIA",
 * // }
 * ```
 *
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
 * @see Based on: https://github.com/bacen/pix-api Pix (SPI) OpenAPI spec.
 * @see Based on: https://github.com/bacen/pix-dict-api DICT OpenAPI spec.
 */
export const parsePixPayload = (value: string): PixPayload | null => {
	if (typeof value !== "string") return null;

	const payload = value.trim();

	// Stryker disable next-line ConditionalExpression,EqualityOperator: a payload this short has no room left for any of the mandatory fields checked below, so it can never parse to a non-null result even without this guard
	if (payload.length <= CRC_TAG_LENGTH || !isValidCrc(payload)) return null;

	const fields = parseTlv(payload);

	if (!fields) return null;

	if (fields[PIX_PAYLOAD_FORMAT_INDICATOR_ID] !== PIX_PAYLOAD_FORMAT_INDICATOR) return null;

	const pointOfInitiation = resolvePointOfInitiation(fields);

	if (pointOfInitiation === null) return null;

	if (fields[PIX_MERCHANT_CATEGORY_CODE_ID] === undefined) return null;
	if (fields[PIX_TRANSACTION_CURRENCY_ID] !== PIX_TRANSACTION_CURRENCY) return null;
	if (fields[PIX_COUNTRY_CODE_ID]?.toUpperCase() !== PIX_COUNTRY_CODE) return null;

	const merchantName = fields[PIX_MERCHANT_NAME_ID];

	if (merchantName === undefined || merchantName === "") return null;

	const merchantCity = fields[PIX_MERCHANT_CITY_ID];

	if (merchantCity === undefined || merchantCity === "") return null;

	const amount = fields[PIX_TRANSACTION_AMOUNT_ID];

	if (!isValidAmount(amount)) return null;

	const merchantKeyInfo = resolveMerchantKeyInfo(fields);

	if (!merchantKeyInfo) return null;

	const txid = resolveTxid(fields);

	if (txid === null) return null;

	return buildPixPayload(merchantName, merchantCity, {
		...merchantKeyInfo,
		amount,
		txid,
		pointOfInitiation,
	});
};
