import {
	PIX_ABSENT_TXID,
	PIX_ADDITIONAL_DATA_ID,
	PIX_COUNTRY_CODE,
	PIX_COUNTRY_CODE_ID,
	PIX_CRC_LENGTH,
	PIX_CRC_TAG,
	PIX_DYNAMIC_POINT_OF_INITIATION,
	PIX_KEY_ID,
	PIX_MERCHANT_CATEGORY_CODE_ID,
	PIX_MERCHANT_CATEGORY_CODE_REGEX,
	PIX_MERCHANT_CITY_ID,
	PIX_MERCHANT_CITY_MAX_LENGTH,
	PIX_MERCHANT_NAME_ID,
	PIX_MERCHANT_NAME_MAX_LENGTH,
	PIX_PAYLOAD_FORMAT_INDICATOR,
	PIX_PAYLOAD_FORMAT_INDICATOR_ID,
	PIX_PAYLOAD_FORMAT_INDICATOR_OBJECT,
	PIX_POINT_OF_INITIATION_ID,
	PIX_STATIC_POINT_OF_INITIATION,
	PIX_TRANSACTION_AMOUNT_ID,
	PIX_TRANSACTION_AMOUNT_MAX_LENGTH,
	PIX_TRANSACTION_CURRENCY,
	PIX_TRANSACTION_CURRENCY_ID,
	PIX_TXID_ID,
	PIX_TXID_REGEX,
	PIX_URL_ID,
	PIX_WITHDRAWAL_FACILITATOR_ID,
} from "../_internals/constants/pix";
import { crc16Ccitt } from "../_internals/crc16-ccitt/crc16-ccitt";
import { findPixMerchantAccountInformation } from "../_internals/find-pix-merchant-account-information/find-pix-merchant-account-information";
import { isValidPixUrl } from "../_internals/is-valid-pix-url/is-valid-pix-url";
import { type TlvFields, parseTlv } from "../_internals/parse-tlv/parse-tlv";
import { getPixKeyInfo } from "../get-pix-key-info/get-pix-key-info";

const AMOUNT_REGEX = /^\d+(?:\.\d{0,2})?$/;

const WITHDRAWAL_FACILITATOR_REGEX = /^\d{8}$/;

const CRC_TAG_LENGTH = PIX_CRC_TAG.length + PIX_CRC_LENGTH;

const isValidCrc = (payload: string): boolean => {
	const checksum = payload.slice(-PIX_CRC_LENGTH);

	if (payload.slice(-CRC_TAG_LENGTH, -PIX_CRC_LENGTH) !== PIX_CRC_TAG) return false;

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

const isValidMerchantAccountInformation = (merchantAccountInformation: TlvFields): boolean => {
	const key = merchantAccountInformation[PIX_KEY_ID];
	const url = merchantAccountInformation[PIX_URL_ID];
	const withdrawalFacilitator = merchantAccountInformation[PIX_WITHDRAWAL_FACILITATOR_ID];

	if (url !== undefined) {
		return key === undefined && withdrawalFacilitator === undefined && isValidPixUrl(url);
	}

	return (
		key !== undefined &&
		getPixKeyInfo(key)?.value === key &&
		(withdrawalFacilitator === undefined ||
			WITHDRAWAL_FACILITATOR_REGEX.test(withdrawalFacilitator))
	);
};

/**
 * Zero is left to the payloads the BCB gives it to: a PSP location, whose amount the payer
 * ignores, and a Pix Saque `fss`.
 * @param {string | undefined} amount - The transaction amount (54), if any.
 * @param {TlvFields} merchantAccountInformation - The Pix template the payload carries.
 * @returns {boolean} Whether the amount is well written and allowed in this payload.
 */
const isValidAmount = (
	amount: string | undefined,
	merchantAccountInformation: TlvFields,
): boolean =>
	amount === undefined ||
	(AMOUNT_REGEX.test(amount) &&
		amount.length <= PIX_TRANSACTION_AMOUNT_MAX_LENGTH &&
		(Number(amount) > 0 ||
			merchantAccountInformation[PIX_URL_ID] !== undefined ||
			merchantAccountInformation[PIX_WITHDRAWAL_FACILITATOR_ID] !== undefined));

const isWithin = (value: string | undefined, maxLength: number): boolean =>
	value !== undefined && value.length <= maxLength;

const isValidTxid = (additionalData: string | undefined, isDynamic: boolean): boolean => {
	const txid = additionalData === undefined ? undefined : parseTlv(additionalData)?.[PIX_TXID_ID];

	if (txid === undefined) return false;

	// With a PSP location the payer ignores whatever 62-05 carries (§2.7), so any value stands.
	return isDynamic || txid === PIX_ABSENT_TXID || PIX_TXID_REGEX.test(txid);
};

/**
 * Validates a Pix BR Code payload, the string behind a Pix QR Code and behind "Pix copia e
 * cola", against the Manual de Padrões para Iniciação do Pix and, where the manual is silent,
 * the EMV® QRCPS-MPM it builds on.
 *
 * The payload is valid when:
 * - it is well-formed TLV (tag-length-value), every length from `01` to `99` (EMV);
 * - it starts with the payload format indicator `000201` (EMV: "shall be the first data
 *   object"), and no later object `00` says otherwise;
 * - the "Point of Initiation Method" (`01`), "opcional" in the manual (§2.7.2), is absent,
 *   `"11"` or `"12"` (EMV);
 * - one of the "Merchant Account Information" templates (IDs 26 to 51) carries the
 *   `br.gov.bcb.pix` GUI, compared without regard to case (§2.5: "O GUI [...] é case
 *   insensitive"), with exactly one of:
 *   - a Pix key (26-01) written in the DICT form: "A regra para formatação das chaves Pix no
 *     BR Code [...] segue estritamente as regras definidas no Manual Operacional do DICT"
 *     (§2.5.1), i.e. a key `getPixKeyInfo` recognizes and writes back unchanged
 *     (`"12345678909"`, `"+5561912345678"`, a lowercase e-mail or UUID, never a mask), and
 *     optionally the 8 digit ISPB of a Pix Saque facilitator (`fss`, 26-03, §2.6);
 *   - a PSP location (26-25), a host and path of at most 77 characters (§2.5.2: "O tamanho
 *     máximo da URL completa (sem o prefixo de protocolo) é de 77 caracteres", all the 99
 *     characters of the template leave next to the GUI), never next to a `fss`, which belongs to the static template of §2.6 (§2.7 maps the dynamic QR Code to
 *     `00` and `25`);
 * - the merchant category code (`52`) is 4 digits, the currency (`53`) is `986` and the
 *   country (`58`) is `BR`, the ISO 3166-1 alpha-2 code the EMV refers to, as ISO writes it.
 *   Neither the Manual do BR Code (v2.0.1, Tabela 1: `58` "“BR” – Código de país ISO3166-1 alpha
 *   2") nor the Manual de Padrões (v2.10.0) says whether `br` is accepted: the only case rule
 *   either states is for the GUI, and every official example writes `BR`, so `br` is rejected,
 *   a choice of this library;
 * - the merchant name (`59`) has at most 25 characters and the merchant city (`60`) at most 15
 *   (EMV "var. up to 25" and "var. up to 15");
 * - a transaction amount (`54`), when present, is digits with an optional `.` decimal mark,
 *   which "may be present even if there are no decimals" (`"98.73"`, `"98"` and `"98."` are the
 *   EMV examples), at most two decimals and 13 characters. It may be zero (the Manual do BR
 *   Code, Tabela 1, gives `"0"` as an example) in a Pix Saque BR Code, one with a `fss`, and in
 *   a payload with a PSP location: the Pix API has "cobranças imediatas que representem um
 *   saque" state "o valor 0.00 (zero)", and allows zero in any charge whose
 *   `valor.modalidadeAlteracao` is 1. A payload built around a key alone must state an amount
 *   greater than zero, the EMV rule ("shall be different from zero") where the BCB assigns zero
 *   no meaning; up to 2.4.0 the rule was the same;
 * - the "Additional Data Field Template" (`62`) carries a `txid` (62-05), "sempre presente em
 *   um BR Code" (§2.6, footnote 21): `***` when there is none (footnote 25), or 1 to 25 letters
 *   and digits (§2.6.2: "limitado a 25 caracteres", "Letras minúsculas [...] Letras maiúsculas
 *   [...] Dígitos decimais"). Next to a PSP location only its presence is checked: "Os campos
 *   Valor e Identificador da Transação (txid) não devem ser preenchidos no QR Code dinâmico. Se
 *   preenchidos, seu conteúdo deve ser ignorado" (§2.7), so a filled txid does not make the
 *   payload invalid, as in 2.4.0, and the transaction amount is only checked for its format.
 *   The static rule excludes the `-` of the Manual do BR Code v2.0.1 example
 *   (`RP12345678-2019`), whose §2.6.2 character set is the Pix-specific rule for the field;
 * - the CRC-16 (`63`) closes the payload and matches it. No official source states the case of
 *   its hexadecimal digits: the Manual do BR Code only says "4 nibbles do resultado. Exemplo:
 *   0xAC05 => “AC05”", and every example of both BCB manuals is upper case. Reading `"1d3d"` as
 *   `"1D3D"` is a choice of this library, kept from 2.4.0; `generatePixPayload` always writes
 *   upper case.
 *
 * Whether the key is registered in the DICT is not something a payload can tell: "Um QR Code
 * estático pode potencialmente ser gerado com uma chave inválida, mas será um QR Code
 * inválido" (§2.4.1, footnote 5).
 *
 * Unreserved Templates (IDs 80 to 99) are ignored. The "QR Code composto" of Pix Automático
 * (Pix recorrente) writes its recurrence location in one of them: when such a payload also
 * carries a key or a payment location in IDs 26 to 51, as the composite examples of §2.8 do,
 * it is accepted here and read as an ordinary static or dynamic payload, its recurrence
 * location dropped. A composite that carries only the recurrence, with no key or payment
 * location in IDs 26 to 51, is reported as invalid.
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
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
 * Manual de Padrões para Iniciação do Pix v2.10.0, §2.4 to §2.8, quoted above, and the
 * `valor.original` of the Pix API: "Para cobranças imediatas que não envolvam saque ou troco:
 * deve apresentar valores maiores do que zero, exceto no caso de o campo
 * valor.modalidadeAlteracao apresentar valor 1; Para cobranças imediatas que representem um
 * saque: deve apresentar o valor 0.00 (zero)".
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf
 * Manual do BR Code v2.0.1, Tabela 1: `54` Transaction Amount, "01..13", "valor da transação.
 * Ex.: "0", "1.00", "123.99"".
 * @see Official: https://www.emvco.com/terms-of-use/?u=/wp-content/uploads/documents/EMVCo-Merchant-Presented-QR-Specification-v1-1.pdf
 * EMV® QRCPS-MPM v1.1, cited by the Pix manual, "Data Objects Under the Root of a QR Code":
 * Merchant Category Code `"52"`, format `N` (numeric), length `"04"`, "As defined by [ISO
 * 18245]"; Country Code `"58"`, "as defined by [ISO 3166-1 alpha 2]"; Merchant Name `"59"`,
 * "var. up to "25""; Merchant City `"60"`, "var. up to "15""; "Position of Data Objects": "The
 * Payload Format Indicator (ID "00") shall be the first data object in the QR Code";
 * "Transaction Amount (ID "54")": "If present, the Transaction Amount shall be different from
 * zero, shall only include (numeric) digits "0" to "9" and may contain a single "." character
 * as the decimal mark [...] the "." character may be present even if there are no decimals".
 * @see Official: https://github.com/bacen/pix-api
 * Pix (SPI) OpenAPI spec.
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html
 * DICT (Diretório de Identificadores de Contas Transacionais) API specification.
 */
export const isValidPixPayload = (value: string): boolean => {
	if (typeof value !== "string") return false;

	const payload = value.trim();

	// Stryker disable next-line ConditionalExpression,EqualityOperator: a payload this short has no room left for any of the mandatory fields checked below, so it can never be valid even without this guard
	if (payload.length <= CRC_TAG_LENGTH || !isValidCrc(payload)) return false;

	const fields = parseTlv(payload);

	if (!fields) return false;

	if (!payload.startsWith(PIX_PAYLOAD_FORMAT_INDICATOR_OBJECT)) return false;
	if (fields[PIX_PAYLOAD_FORMAT_INDICATOR_ID] !== PIX_PAYLOAD_FORMAT_INDICATOR) return false;
	if (!isValidPointOfInitiation(fields)) return false;
	// An absent code reads as "undefined", which is not 4 digits either.
	if (!PIX_MERCHANT_CATEGORY_CODE_REGEX.test(String(fields[PIX_MERCHANT_CATEGORY_CODE_ID])))
		return false;
	if (fields[PIX_TRANSACTION_CURRENCY_ID] !== PIX_TRANSACTION_CURRENCY) return false;
	if (fields[PIX_COUNTRY_CODE_ID] !== PIX_COUNTRY_CODE) return false;
	if (!isWithin(fields[PIX_MERCHANT_NAME_ID], PIX_MERCHANT_NAME_MAX_LENGTH)) return false;
	if (!isWithin(fields[PIX_MERCHANT_CITY_ID], PIX_MERCHANT_CITY_MAX_LENGTH)) return false;

	const merchantAccountInformation = findPixMerchantAccountInformation(fields);

	if (!merchantAccountInformation) return false;
	if (!isValidMerchantAccountInformation(merchantAccountInformation)) return false;
	if (!isValidAmount(fields[PIX_TRANSACTION_AMOUNT_ID], merchantAccountInformation)) return false;

	return isValidTxid(
		fields[PIX_ADDITIONAL_DATA_ID],
		merchantAccountInformation[PIX_URL_ID] !== undefined,
	);
};
