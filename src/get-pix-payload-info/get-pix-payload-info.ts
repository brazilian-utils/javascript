import {
	PIX_ABSENT_TXID,
	PIX_ADDITIONAL_DATA_ID,
	PIX_DESCRIPTION_ID,
	PIX_DYNAMIC_POINT_OF_INITIATION,
	PIX_KEY_ID,
	PIX_MERCHANT_CITY_ID,
	PIX_MERCHANT_NAME_ID,
	PIX_POINT_OF_INITIATION_ID,
	PIX_TRANSACTION_AMOUNT_ID,
	PIX_TXID_ID,
	PIX_URL_ID,
	PIX_WITHDRAWAL_FACILITATOR_ID,
} from "../_internals/constants/pix";
import { findPixMerchantAccountInformation } from "../_internals/find-pix-merchant-account-information/find-pix-merchant-account-information";
import { type TlvFields, parseTlv } from "../_internals/parse-tlv/parse-tlv";
import { isValidPixPayload } from "../is-valid-pix-payload/is-valid-pix-payload";

/**
 * How a Pix BR Code is meant to be presented for payment: `"dynamic"` when it carries a PSP
 * location or when the "Point of Initiation Method" object (`01`) is `"12"`, the value the
 * Manual do BR Code reads as "só pode ser utilizado uma vez"; `"static"` otherwise.
 */
export type PixPointOfInitiation = "static" | "dynamic";

/** The fields `getPixPayloadInfo` reads out of a Pix BR Code. */
export type PixPayloadInfo = {
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

/**
 * Reads a TLV string `isValidPixPayload` has already found well-formed. The spread turns the
 * `null` `parseTlv` gives for a malformed string, which cannot happen here, into `{}`, so the
 * result is typed as the objects without a branch nothing could ever take.
 *
 * @param {string} value - A TLV string `isValidPixPayload` has already parsed.
 * @returns {TlvFields} The objects of the string, keyed by ID.
 */
const readTlv = (value: string): TlvFields => ({ ...parseTlv(value) });

const readTxid = (additionalData: string | undefined): string | undefined => {
	if (additionalData === undefined) return undefined;

	return readTlv(additionalData)[PIX_TXID_ID];
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
 * @returns {PixPayloadInfo|null} The Pix data of the payload, or `null` exactly when
 * `isValidPixPayload` returns `false`.
 *
 * @example
 * ```typescript
 * getPixPayloadInfo(
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
 * @see Official: https://github.com/bacen/pix-api
 * Pix (SPI) OpenAPI spec.
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html
 * DICT (Diretório de Identificadores de Contas Transacionais) API specification.
 */
export const getPixPayloadInfo = (value: string): PixPayloadInfo | null => {
	if (!isValidPixPayload(value)) return null;

	const fields = readTlv(value.trim());
	const merchantAccountInformation: TlvFields = {
		...findPixMerchantAccountInformation(fields),
	};
	const url = merchantAccountInformation[PIX_URL_ID];
	const amount = fields[PIX_TRANSACTION_AMOUNT_ID];
	const txid = readTxid(fields[PIX_ADDITIONAL_DATA_ID]);
	const isDynamic =
		url !== undefined || fields[PIX_POINT_OF_INITIATION_ID] === PIX_DYNAMIC_POINT_OF_INITIATION;
	const pix: PixPayloadInfo = {
		// isValidPixPayload has checked that both are there and not empty.
		merchantName: String(fields[PIX_MERCHANT_NAME_ID]),
		merchantCity: String(fields[PIX_MERCHANT_CITY_ID]),
		pointOfInitiation: isDynamic ? "dynamic" : "static",
	};
	const key = merchantAccountInformation[PIX_KEY_ID];
	const description = merchantAccountInformation[PIX_DESCRIPTION_ID];
	const withdrawalFacilitator = merchantAccountInformation[PIX_WITHDRAWAL_FACILITATOR_ID];

	if (key !== undefined) pix.key = key;
	if (url !== undefined) pix.url = url;
	if (description !== undefined) pix.description = description;
	if (withdrawalFacilitator !== undefined) pix.withdrawalFacilitator = withdrawalFacilitator;

	if (amount !== undefined && url === undefined) pix.amount = Number(amount);
	if (txid !== undefined && txid !== PIX_ABSENT_TXID && url === undefined) pix.txid = txid;

	return pix;
};
