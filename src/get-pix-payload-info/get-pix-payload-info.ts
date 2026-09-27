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
 * `"dynamic"` or `"static"`, from two different signals of a BR Code:
 * - a PSP location in 26-25, which is what makes a QR Code dynamic in the Manual de Padrões
 *   para Iniciação do Pix (§2.4.2: it "é configurado com uma URL que é acessada no momento de
 *   sua leitura"), as opposed to the static one that carries the key (§2.4.1);
 * - the "Point of Initiation Method" (`01`) set to `"12"`, which the EMV® QRCPS-MPM uses "when
 *   a new QR Code is shown for each transaction" (`"11"`: "the same QR Code is shown for more
 *   than one transaction") and the Pix manual reads as "não deve ser iniciado mais de um
 *   pagamento com este mesmo QR Code" (§2.7.2).
 *
 * It is `"dynamic"` when either is present and `"static"` when neither is, so a payload that
 * carries a key and `01` = `"12"` (a static QR Code in the §2.4 sense, marked single use) is
 * reported as `"dynamic"`. `url` and `key` tell the two §2.4 kinds apart.
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
	/**
	 * `"dynamic"` when the payload carries a PSP location (`url`) or marks itself single use
	 * with `01` = `"12"`, `"static"` otherwise; see `PixPointOfInitiation`.
	 */
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

/**
 * Parses a Pix BR Code payload, the string behind a Pix QR Code and behind "Pix copia e cola".
 *
 * The payload is read only when `isValidPixPayload` accepts it, under the rules of the Manual
 * de Padrões para Iniciação do Pix documented there: a Pix key in the DICT form (§2.5.1) or a
 * PSP location of at most 77 characters (§2.5.2), a merchant name of at most 25 characters and
 * a merchant city of at most 15, and an "Additional Data Field Template" (62) that always
 * carries the `txid` (62-05), "sempre presente em um BR Code" (§2.6, footnote 21), either the
 * `***` marker or 1 to 25 letters and digits (§2.6.2), and always `***` next to a PSP location
 * (§2.7: "Os campos Valor e Identificador da Transação (txid) não devem ser preenchidos no QR
 * Code dinâmico"). `txid` is left out for the `***` marker.
 *
 * Whether the key is registered in the DICT is only settled at payment time, so a key in the
 * right form is read even when no account holds it.
 *
 * Unreserved Templates (IDs 80 to 99) are ignored. The "QR Code composto" of Pix Automático
 * (Pix recorrente) writes its recurrence location in one of them: when such a payload also
 * carries a key or a payment location in IDs 26 to 51, as the composite examples of §2.8 do,
 * it is parsed here as an ordinary static or dynamic payload and its recurrence location is
 * dropped, so a consumer that has to tell the two apart cannot rely on this parser. A
 * composite that carries only the recurrence returns `null`.
 *
 * The "Point of Initiation Method" object (`01`) is optional ("O campo BR Code 01 (Point of
 * Initiation Method), opcional", §2.7.2) and, when present, `"11"` or `"12"`. `pointOfInitiation`
 * is reported as `"dynamic"` when the payload carries a PSP location or when `01` is `"12"`,
 * and as `"static"` otherwise. When the payload carries a PSP location its transaction amount
 * (54) is left out, since §2.7 has the payer ignore it ("Se preenchidos, seu conteúdo deve ser
 * ignorado"): the PSP location is the source of truth.
 *
 * The transaction amount (54), when present, follows the EMV® QRCPS-MPM: digits with an
 * optional `.` decimal mark that "may be present even if there are no decimals" (`"98."` reads
 * as 98), at most two decimals and 13 characters. It may be zero (Manual do BR Code, Tabela 1:
 * "Ex.: "0", "1.00", "123.99"") in a Pix Saque BR Code and next to a PSP location, the payloads
 * the Pix API gives a zero amount to ("Para cobranças imediatas que representem um saque: deve
 * apresentar o valor 0.00 (zero)"); a payload built around a key alone must state one greater
 * than zero, as the EMV has it ("shall be different from zero"). §2.6 of the Pix manual puts the
 * ISPB of the "facilitador de serviço de saque" in sub-object 26-03 (`fss`) and states that "a
 * presença do campo fss, com um ISPB válido […] indica que esse é um QR Code para Pix Saque";
 * `withdrawalFacilitator` reads the `fss` back. A `fss` that is not 8 digits is
 * rejected, and so is a `fss` written next to a PSP location: §2.7 of the Manual de Padrões
 * para Iniciação do Pix maps the dynamic QR Code to exactly two sub-objects, `00` (GUI) and
 * `25` (URL), while `fss` belongs to the static template of §2.6, whose §2.6.1 states that
 * "não há funcionalidade de Pix Troco para QR Codes estáticos, apenas para QR Codes
 * dinâmicos".
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
 * Manual do BR Code v2.0.1, Tabela 1, `54` Transaction Amount.
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
 * Manual de Padrões para Iniciação do Pix v2.10.0, §2.6, §2.7 and the `valor.original` of the
 * Pix API.
 * @see Official: https://www.emvco.com/terms-of-use/?u=/wp-content/uploads/documents/EMVCo-Merchant-Presented-QR-Specification-v1-1.pdf
 * EMV® QRCPS-MPM v1.1, cited by the Pix manual, "Transaction Amount (ID "54")": "If present,
 * the Transaction Amount shall be different from zero [...] the "." character may be present
 * even if there are no decimals"; its valid examples are "98.73", "98" and "98.".
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
	// isValidPixPayload has checked that 62 is there and carries 62-05.
	const txid = String(readTlv(String(fields[PIX_ADDITIONAL_DATA_ID]))[PIX_TXID_ID]);
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
	if (txid !== PIX_ABSENT_TXID) pix.txid = txid;

	return pix;
};
