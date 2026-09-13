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
	PIX_WITHDRAWAL_FACILITATOR_ID,
} from "../_internals/constants/pix";
import { crc16Ccitt } from "../_internals/crc16-ccitt/crc16-ccitt";
import { isValidPixUrl } from "../_internals/is-valid-pix-url/is-valid-pix-url";
import { type TlvFields, parseTlv } from "../_internals/parse-tlv/parse-tlv";

/**
 * How a Pix BR Code is meant to be presented for payment: `"dynamic"` when it carries a PSP
 * location or when the "Point of Initiation Method" object (`01`) is `"12"`, the value the
 * Manual do BR Code reads as "só pode ser utilizado uma vez"; `"static"` otherwise.
 */
export type PixPointOfInitiation = "static" | "dynamic";

/** The fields `parsePixPayload` reads out of a Pix BR Code. */
export type PixPayload = {
	/** The Pix key of the receiver, present in a static payload. */
	key?: string;
	/** URL of the dynamic payload, present instead of `key` in a dynamic one. */
	url?: string;
	/** Free text the receiver wrote for the payer. */
	description?: string;
	/**
	 * The 8 digit ISPB of the "facilitador de serviço de saque" (`fss`, sub-object 26-03),
	 * present only in a Pix Saque BR Code.
	 */
	withdrawalFacilitator?: string;
	/** Name of the receiver, at most 25 ASCII characters. */
	merchantName: string;
	/** City of the receiver, at most 15 ASCII characters. */
	merchantCity: string;
	/** Amount in BRL, absent when the payer types it. */
	amount?: number;
	/** Transaction ID, absent when the payload carries the `***` marker. */
	txid?: string;
	/** Whether the payload is presented as a single use one ("dynamic") or not ("static"). */
	pointOfInitiation: PixPointOfInitiation;
};

// Stryker disable next-line Regex: this is only ever tested against `checksum`, a slice of exactly PIX_CRC_LENGTH (4) characters, so dropping either anchor cannot change whether it matches
const CRC_VALUE_REGEX = /^[0-9a-f]{4}$/i;

const AMOUNT_REGEX = /^\d+(?:\.\d{1,2})?$/;

const WITHDRAWAL_FACILITATOR_REGEX = /^\d{8}$/;

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

const isValidAmount = (
	amount: string | undefined,
	{ url, withdrawalFacilitator }: MerchantKeyInfo,
): boolean => {
	if (amount === undefined) return true;

	if (!AMOUNT_REGEX.test(amount) || amount.length > PIX_TRANSACTION_AMOUNT_MAX_LENGTH) return false;

	return url !== undefined || withdrawalFacilitator !== undefined || Number(amount) > 0;
};

type MerchantKeyInfo = {
	key?: string;
	url?: string;
	description?: string;
	withdrawalFacilitator?: string;
};

const resolveMerchantKeyInfo = (fields: TlvFields): MerchantKeyInfo | null => {
	const merchantAccountInformation = findMerchantAccountInformation(fields);

	if (!merchantAccountInformation) return null;

	const key = merchantAccountInformation[PIX_KEY_ID];
	const url = merchantAccountInformation[PIX_URL_ID];
	const description = merchantAccountInformation[PIX_DESCRIPTION_ID];
	const withdrawalFacilitator = merchantAccountInformation[PIX_WITHDRAWAL_FACILITATOR_ID];

	if ((key === undefined) === (url === undefined)) return null;
	if (key !== undefined && !key) return null;
	if (url !== undefined && !isValidPixUrl(url)) return null;
	if (withdrawalFacilitator !== undefined && url !== undefined) return null;
	if (
		withdrawalFacilitator !== undefined &&
		!WITHDRAWAL_FACILITATOR_REGEX.test(withdrawalFacilitator)
	) {
		return null;
	}

	return { key, url, description, withdrawalFacilitator };
};

const resolveTxid = (fields: TlvFields): string | undefined | null => {
	const additionalData = fields[PIX_ADDITIONAL_DATA_ID];

	if (additionalData === undefined) return undefined;

	const objects = parseTlv(additionalData);

	if (!objects) return null;

	return objects[PIX_TXID_ID];
};

type OptionalPixFields = MerchantKeyInfo & {
	amount?: string;
	txid?: string;
	pointOfInitiation?: string;
};

const buildPixPayload = (
	merchantName: string,
	merchantCity: string,
	optional: OptionalPixFields,
): PixPayload => {
	const { key, url, description, withdrawalFacilitator, amount, txid, pointOfInitiation } =
		optional;
	const isDynamic = url !== undefined || pointOfInitiation === PIX_DYNAMIC_POINT_OF_INITIATION;
	const pix: PixPayload = {
		merchantName,
		merchantCity,
		pointOfInitiation: isDynamic ? "dynamic" : "static",
	};

	if (key !== undefined) pix.key = key;
	if (url !== undefined) pix.url = url;
	if (description !== undefined) pix.description = description;
	if (withdrawalFacilitator !== undefined) pix.withdrawalFacilitator = withdrawalFacilitator;

	if (amount !== undefined && url === undefined) pix.amount = Number(amount);
	if (txid !== undefined && txid !== PIX_ABSENT_TXID && url === undefined) pix.txid = txid;

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
 * overrun them, so they are not enforced here, and neither is the 77 character limit of the
 * Pix key field (26-01).
 *
 * Unreserved Templates (IDs 80 to 99) are ignored. The "QR Code composto" of Pix Automático
 * (Pix recorrente) writes its recurrence location in one of them: when such a payload also
 * carries a payment location in 26-25, as the composite example of the Pix manual does, it is
 * parsed here as an ordinary dynamic payload and its recurrence location is dropped, so a
 * consumer that has to tell the two apart cannot rely on this parser. Only a payload with no
 * Pix template at all in IDs 26 to 51 returns `null`.
 *
 * The merchant account information must carry exactly one of a Pix key (26-01) or a PSP
 * location (26-25); the location is checked with the same host and path rule
 * `generatePixPayload` applies. The "Point of Initiation Method" object (`01`) is advisory, as
 * the Manual do BR Code marks it `Uso: O` and only assigns a meaning to the value `"12"`
 * ("Se o valor 12 estiver presente, significa que o BR Code só pode ser utilizado uma vez"):
 * it may be absent from either shape, and only a value outside `{"11", "12"}` is rejected.
 * `pointOfInitiation` is reported as `"dynamic"` when the payload carries a PSP location or
 * when `01` is `"12"`, and as `"static"` otherwise. When the payload carries a PSP location the
 * transaction amount (54) and the `txid` (62-05) are ignored, as the manual mandates, because
 * the PSP location is the source of truth for both.
 *
 * A payload built around a Pix key that carries the transaction amount (54) must state an
 * amount greater than zero, unless it is a Pix Saque BR Code: §2.6 of the Pix manual puts the
 * ISPB of the "facilitador de serviço de saque" in sub-object 26-03 (`fss`) of the same
 * template this parser already reads, and states that "a presença do campo fss, com um ISPB
 * válido […] indica que esse é um QR Code para Pix Saque", whose amount is settled at payment
 * time. So `54` set to `"0"` or `"0.00"` is accepted together with `fss` and rejected without
 * it; that rejection is a deliberate restriction of this library, not a rule of the manual,
 * whose field table allows `"0"` in any payload. A `fss` that is not 8 digits is rejected, and
 * so is a `fss` written next to a PSP location: §2.7 of the Manual de Padrões para Iniciação do
 * Pix maps the dynamic QR Code to exactly two sub-objects, `00` (GUI) and `25` (URL), while
 * `fss` belongs to the static template of §2.6, whose §2.6.1 states that "não há funcionalidade
 * de Pix Troco para QR Codes estáticos, apenas para QR Codes dinâmicos".
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
 * //   pointOfInitiation: "static",
 * // }
 * ```
 *
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
 * @see Official: https://github.com/bacen/pix-api Pix (SPI) OpenAPI spec.
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html
 * DICT (Diretório de Identificadores de Contas Transacionais) API specification.
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

	const merchantKeyInfo = resolveMerchantKeyInfo(fields);

	if (!merchantKeyInfo) return null;

	const amount = fields[PIX_TRANSACTION_AMOUNT_ID];

	if (!isValidAmount(amount, merchantKeyInfo)) return null;

	const txid = resolveTxid(fields);

	if (txid === null) return null;

	return buildPixPayload(merchantName, merchantCity, {
		...merchantKeyInfo,
		amount,
		txid,
		pointOfInitiation,
	});
};
