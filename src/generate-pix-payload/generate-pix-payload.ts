import {
	PIX_ABSENT_TXID,
	PIX_ADDITIONAL_DATA_ID,
	PIX_COUNTRY_CODE,
	PIX_COUNTRY_CODE_ID,
	PIX_CRC_TAG,
	PIX_DESCRIPTION_ID,
	PIX_DESCRIPTION_MAX_LENGTH,
	PIX_DYNAMIC_POINT_OF_INITIATION,
	PIX_GUI,
	PIX_GUI_ID,
	PIX_KEY_ID,
	PIX_MERCHANT_ACCOUNT_INFORMATION_ID,
	PIX_MERCHANT_ACCOUNT_INFORMATION_MAX_LENGTH,
	PIX_MERCHANT_CATEGORY_CODE,
	PIX_MERCHANT_CATEGORY_CODE_ID,
	PIX_MERCHANT_CITY_ID,
	PIX_MERCHANT_CITY_MAX_LENGTH,
	PIX_MERCHANT_NAME_ID,
	PIX_MERCHANT_NAME_MAX_LENGTH,
	PIX_PAYLOAD_FORMAT_INDICATOR,
	PIX_PAYLOAD_FORMAT_INDICATOR_ID,
	PIX_POINT_OF_INITIATION_ID,
	PIX_TRANSACTION_AMOUNT_ID,
	PIX_TRANSACTION_AMOUNT_MAX_LENGTH,
	PIX_TRANSACTION_CURRENCY,
	PIX_TRANSACTION_CURRENCY_ID,
	PIX_TXID_ID,
	PIX_URL_ID,
	PIX_URL_MAX_LENGTH,
} from "../_internals/constants/pix";
import { crc16Ccitt } from "../_internals/crc16-ccitt/crc16-ccitt";
import { formatTlv } from "../_internals/format-tlv/format-tlv";
import { isNullish } from "../_internals/is-nullish/is-nullish";
import { isValidPixUrl } from "../_internals/is-valid-pix-url/is-valid-pix-url";
import { sanitizeToAscii } from "../_internals/sanitize-to-ascii/sanitize-to-ascii";
import { parsePixKey } from "../parse-pix-key/parse-pix-key";
import { AMOUNT_DECIMAL_PLACES, TLV_OVERHEAD, TXID_REGEX } from "./constants";

export type GeneratePixPayloadParams = {
	/** The Pix key of the receiver, in any accepted form. Required unless `url` is given. */
	key?: string;
	/**
	 * The PSP location of a dynamic payload (Bacen field 26-25), without a URL scheme, e.g.
	 * `"pix.example.com/qr/v2/1234"`. When given, the payload is generated as dynamic
	 * (`pointOfInitiation` `"12"`) and carries this URL instead of a key. Required unless `key`
	 * is given; giving both `key` and `url` is invalid, just like giving neither.
	 */
	url?: string;
	/** Name of the receiver, folded to ASCII and truncated to 25 characters. */
	merchantName: string;
	/** City of the receiver, folded to ASCII and truncated to 15 characters. */
	merchantCity: string;
	/** Amount in BRL. Omit it to let the payer type it. Not allowed together with `url`: a dynamic BR Code takes its amount from the PSP location. */
	amount?: number;
	/** Transaction ID, 1 to 25 characters of `[A-Za-z0-9]` (default: the absent marker `***`). Not allowed together with `url`. */
	txid?: string;
	/** Free text shown to the payer, folded to ASCII and truncated to what the template holds. */
	description?: string;
};

const toAsciiField = (value: unknown, maxLength: number): string =>
	typeof value === "string" ? sanitizeToAscii(value).slice(0, maxLength).trim() : "";

/**
 * Generates the payload of a Pix BR Code, the string behind a Pix QR Code and behind "Pix
 * copia e cola".
 *
 * Exactly one of `params.key` or `params.url` must be given: `null` is returned when both are
 * given and when neither is given, since only one of them can occupy the "Merchant Account
 * Information" template at a time.
 *
 * When `params.key` is given, it is normalized to its DICT canonical form by `parsePixKey` and
 * the payload is static: the "Point of Initiation Method" object is left out, so the payload
 * may be paid more than once, as in the example of the Bacen manual.
 *
 * When `params.url` is given instead, the payload is dynamic per the Manual de Padrões para
 * Iniciação do Pix: the URL takes the key's place in the "Merchant Account Information"
 * template (sub-object `25` instead of `01`) and the "Point of Initiation Method" object (`01`)
 * is set to `"12"`. `params.url` must be at most 77 characters, the length that keeps the
 * template within its 99 character limit together with the `br.gov.bcb.pix` GUI. `parsePixPayload`
 * already parses both shapes, so `parsePixPayload(generatePixPayload({ url, ... }))` round-trips.
 *
 * The merchant name, the merchant city and the description are folded to printable ASCII
 * (accents are dropped) and truncated to the lengths the BR Code allows, the description to
 * whatever is left of the 99 characters the "Merchant Account Information" template holds.
 *
 * @param {GeneratePixPayloadParams} params - The parameters of the payload.
 * @param {string} [params.key] - The Pix key of the receiver. Required unless `url` is given.
 * @param {string} [params.url] - The PSP location of a dynamic payload. Required unless `key`
 * is given.
 * @param {string} params.merchantName - The name of the receiver.
 * @param {string} params.merchantCity - The city of the receiver.
 * @param {number} [params.amount] - The amount in BRL. Omit it to let the payer type it.
 * @param {string} [params.txid] - The transaction ID, 1 to 25 characters of `[A-Za-z0-9]`.
 * @param {string} [params.description] - The free text shown to the payer.
 * @returns {string|null} The BR Code payload, or `null` when the parameters are invalid.
 *
 * @example
 * ```typescript
 * generatePixPayload({
 *   key: "123.456.789-09",
 *   merchantName: "Fulano de Tal",
 *   merchantCity: "Brasília",
 *   amount: 123.45,
 * });
 * // "00020126330014br.gov.bcb.pix0111123456789095204000053039865406123.455802BR..."
 *
 * generatePixPayload({
 *   url: "pix.example.com/qr/v2/1234",
 *   merchantName: "Fulano de Tal",
 *   merchantCity: "Brasília",
 * });
 * // "00020101021226480014br.gov.bcb.pix2526pix.example.com/qr/v2/12345204000053039865802BR5913Fulano de Tal6008Brasilia62070503***6304FC66"
 *
 * generatePixPayload({ merchantName: "Fulano", merchantCity: "Brasília" }); // null (neither key nor url)
 * generatePixPayload({ key: "123.456.789-09", url: "pix.example.com/qr/v2/1234", merchantName: "Fulano", merchantCity: "Brasília" }); // null (both key and url)
 * ```
 *
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
 * @see Based on: https://github.com/bacen/pix-api Pix (SPI) OpenAPI spec.
 * @see Based on: https://github.com/bacen/pix-dict-api DICT OpenAPI spec.
 */
export const generatePixPayload = (params: GeneratePixPayloadParams): string | null => {
	if (isNullish(params) || typeof params !== "object") return null;

	const { key: keyInput, url: urlInput } = params;

	if ((keyInput !== undefined) === (urlInput !== undefined)) return null;

	let identifierId: string;
	let identifierValue: string;
	let pointOfInitiation: string | undefined;

	if (keyInput !== undefined) {
		const key = parsePixKey(keyInput);

		if (!key) return null;

		identifierId = PIX_KEY_ID;
		identifierValue = key.value;
	} else {
		const url = urlInput;

		if (typeof url !== "string" || url.length > PIX_URL_MAX_LENGTH || !isValidPixUrl(url))
			return null;

		identifierId = PIX_URL_ID;
		identifierValue = url;
		pointOfInitiation = PIX_DYNAMIC_POINT_OF_INITIATION;
	}

	const merchantName = toAsciiField(params.merchantName, PIX_MERCHANT_NAME_MAX_LENGTH);

	if (!merchantName) return null;

	const merchantCity = toAsciiField(params.merchantCity, PIX_MERCHANT_CITY_MAX_LENGTH);

	if (!merchantCity) return null;

	const { amount, txid } = params;

	if (pointOfInitiation !== undefined && (amount !== undefined || txid !== undefined)) return null;

	if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) return null;

	const formattedAmount = amount === undefined ? "" : amount.toFixed(AMOUNT_DECIMAL_PLACES);

	if (formattedAmount.length > PIX_TRANSACTION_AMOUNT_MAX_LENGTH) return null;

	if (amount !== undefined && Number(formattedAmount) === 0) return null;

	if (txid !== undefined && (typeof txid !== "string" || !TXID_REGEX.test(txid))) return null;

	const gui = formatTlv({ id: PIX_GUI_ID, value: PIX_GUI });
	const identifierObject = formatTlv({ id: identifierId, value: identifierValue });
	const descriptionRoom = Math.min(
		PIX_DESCRIPTION_MAX_LENGTH,
		PIX_MERCHANT_ACCOUNT_INFORMATION_MAX_LENGTH -
			gui.length -
			identifierObject.length -
			TLV_OVERHEAD,
	);
	const description = toAsciiField(params.description, Math.max(descriptionRoom, 0));

	const merchantAccountInformation =
		gui +
		identifierObject +
		(description ? formatTlv({ id: PIX_DESCRIPTION_ID, value: description }) : "");

	const payload =
		formatTlv({ id: PIX_PAYLOAD_FORMAT_INDICATOR_ID, value: PIX_PAYLOAD_FORMAT_INDICATOR }) +
		(pointOfInitiation
			? formatTlv({ id: PIX_POINT_OF_INITIATION_ID, value: pointOfInitiation })
			: "") +
		formatTlv({ id: PIX_MERCHANT_ACCOUNT_INFORMATION_ID, value: merchantAccountInformation }) +
		formatTlv({ id: PIX_MERCHANT_CATEGORY_CODE_ID, value: PIX_MERCHANT_CATEGORY_CODE }) +
		formatTlv({ id: PIX_TRANSACTION_CURRENCY_ID, value: PIX_TRANSACTION_CURRENCY }) +
		(formattedAmount ? formatTlv({ id: PIX_TRANSACTION_AMOUNT_ID, value: formattedAmount }) : "") +
		formatTlv({ id: PIX_COUNTRY_CODE_ID, value: PIX_COUNTRY_CODE }) +
		formatTlv({ id: PIX_MERCHANT_NAME_ID, value: merchantName }) +
		formatTlv({ id: PIX_MERCHANT_CITY_ID, value: merchantCity }) +
		formatTlv({
			id: PIX_ADDITIONAL_DATA_ID,
			value: formatTlv({ id: PIX_TXID_ID, value: txid ?? PIX_ABSENT_TXID }),
		}) +
		PIX_CRC_TAG;

	return payload + crc16Ccitt(payload);
};
