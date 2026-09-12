import { parsePixPayload } from "../parse-pix-payload/parse-pix-payload";

/**
 * Validates a Pix BR Code payload, the string behind a Pix QR Code and behind "Pix copia e
 * cola".
 *
 * The payload is valid when its TLV (tag-length-value) structure is well-formed, when the
 * mandatory objects are present and well-formed (payload format indicator `01`, merchant
 * category code, currency `986`, country `BR`, merchant name and merchant city), when one of
 * the "Merchant Account Information" templates (IDs 26 to 51) carries the `br.gov.bcb.pix` GUI
 * together with a key (static QR Code) or a URL (dynamic QR Code), and when the CRC-16 matches
 * the rest of the payload.
 *
 * The key itself is not checked against the DICT formats: the manual states a static QR Code
 * can be generated with a key that is not (or is no longer) registered, so use `isValidPixKey`
 * when that matters.
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
 * @see Based on: https://github.com/bacen/pix-api Pix (SPI) OpenAPI spec.
 * @see Based on: https://github.com/bacen/pix-dict-api DICT OpenAPI spec.
 */
export const isValidPixPayload = (value: string): boolean => parsePixPayload(value) !== null;
