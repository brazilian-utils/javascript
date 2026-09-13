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
import {
	AMOUNT_DECIMAL_PLACES,
	AMOUNT_REGEX,
	AMOUNT_COMPARISON_DECIMAL_PLACES,
	TLV_OVERHEAD,
	TXID_REGEX,
} from "./constants";

/** The parameters `generatePixPayload` takes to build a Pix BR Code. */
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
	/** Amount in BRL, with at most two decimal places. Omit it to let the payer type it. Not allowed together with `url`: a dynamic BR Code takes its amount from the PSP location. */
	amount?: number;
	/** Transaction ID, 1 to 25 characters of `[A-Za-z0-9]` (default: the absent marker `***`). Not allowed together with `url`. */
	txid?: string;
	/** Free text shown to the payer, folded to ASCII and truncated to what the template holds. */
	description?: string;
};

const toAsciiField = (value: unknown, maxLength: number): string =>
	typeof value === "string" ? sanitizeToAscii(value).slice(0, maxLength).trim() : "";

type PixIdentifier = {
	identifierId: string;
	identifierValue: string;
	pointOfInitiation: string | undefined;
};

const resolveIdentifier = (
	keyInput: string | undefined,
	urlInput: string | undefined,
): PixIdentifier | null => {
	if (keyInput === undefined) {
		const url = urlInput;

		if (typeof url !== "string" || url.length > PIX_URL_MAX_LENGTH || !isValidPixUrl(url))
			return null;

		return {
			identifierId: PIX_URL_ID,
			identifierValue: url,
			pointOfInitiation: PIX_DYNAMIC_POINT_OF_INITIATION,
		};
	}

	const key = parsePixKey(keyInput);

	if (!key) return null;

	return { identifierId: PIX_KEY_ID, identifierValue: key.value, pointOfInitiation: undefined };
};

const resolveFormattedAmount = (
	amount: number | undefined,
	txid: string | undefined,
	pointOfInitiation: string | undefined,
): string | null => {
	if (pointOfInitiation !== undefined && (amount !== undefined || txid !== undefined)) return null;

	// `Number.isFinite` is false for every value that is not a number, so this guard is what keeps
	// `toFixed` below from being called on something that has no `toFixed`. A negative amount keeps
	// its sign in `toFixed`, so the amount regex below turns it down, and an amount that is zero or
	// rounds to zero is turned down by the `Number(formattedAmount)` check.
	if (amount !== undefined && !Number.isFinite(amount)) return null;

	const formattedAmount = amount === undefined ? "" : amount.toFixed(AMOUNT_DECIMAL_PLACES);

	if (amount !== undefined && !AMOUNT_REGEX.test(formattedAmount)) return null;

	if (formattedAmount.length > PIX_TRANSACTION_AMOUNT_MAX_LENGTH) return null;

	if (amount !== undefined && Number(formattedAmount) === 0) return null;

	if (
		amount !== undefined &&
		Number(amount.toFixed(AMOUNT_COMPARISON_DECIMAL_PLACES)) !== Number(formattedAmount)
	)
		return null;

	if (txid !== undefined && (typeof txid !== "string" || !TXID_REGEX.test(txid))) return null;

	return formattedAmount;
};

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
 * Object `01` is optional in the Manual do BR Code (`Uso: O`), so writing it only for a dynamic
 * payload is one of the shapes the manual allows and follows its own examples; `parsePixPayload`
 * accepts the others too. The Pix Saque BR Code, which announces the ISPB of the "facilitador de
 * serviço de saque" in sub-object 26-03 (`fss`), is not generated here, only parsed.
 *
 * Unreserved Templates (IDs 80 to 99) are never written: the location always goes in the
 * "Merchant Account Information" template, so the "QR Code composto" of Pix Automático (Pix
 * recorrente), which puts its recurrence location in one of them, is out of scope here.
 * `parsePixPayload` does read a composto, but only as an ordinary dynamic payload.
 *
 * The merchant name, the merchant city and the description are folded to printable ASCII
 * (accents are dropped) and truncated to the lengths the BR Code allows, the description to
 * whatever is left of the 99 characters the "Merchant Account Information" template holds.
 *
 * `params.amount` is written with the two decimal places the BR Code takes, so an amount that
 * does not survive that round trip (`0.005`, `123.456`) is refused rather than rounded into a
 * payload that asks the payer for a different sum.
 *
 * @param {GeneratePixPayloadParams} params - The parameters of the payload.
 * @param {string} [params.key] - The Pix key of the receiver. Required unless `url` is given.
 * @param {string} [params.url] - The PSP location of a dynamic payload. Required unless `key`
 * is given.
 * @param {string} params.merchantName - The name of the receiver.
 * @param {string} params.merchantCity - The city of the receiver.
 * @param {number} [params.amount] - The amount in BRL, with at most two decimal places. Omit it
 * to let the payer type it.
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
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
 * @see Official: https://github.com/bacen/pix-api Pix (SPI) OpenAPI spec.
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html
 * DICT (Diretório de Identificadores de Contas Transacionais) API specification.
 */
export const generatePixPayload = (params: GeneratePixPayloadParams): string | null => {
	if (isNullish(params) || typeof params !== "object") return null;

	const { key: keyInput, url: urlInput } = params;

	if ((keyInput !== undefined) === (urlInput !== undefined)) return null;

	const identifier = resolveIdentifier(keyInput, urlInput);

	if (identifier === null) return null;

	const { identifierId, identifierValue, pointOfInitiation } = identifier;

	const merchantName = toAsciiField(params.merchantName, PIX_MERCHANT_NAME_MAX_LENGTH);

	if (!merchantName) return null;

	const merchantCity = toAsciiField(params.merchantCity, PIX_MERCHANT_CITY_MAX_LENGTH);

	if (!merchantCity) return null;

	const { amount, txid } = params;

	const formattedAmount = resolveFormattedAmount(amount, txid, pointOfInitiation);

	if (formattedAmount === null) return null;

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
		(pointOfInitiation === undefined
			? ""
			: formatTlv({ id: PIX_POINT_OF_INITIATION_ID, value: pointOfInitiation })) +
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
