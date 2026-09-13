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
 * @see Official: https://github.com/bacen/pix-api Pix (SPI) OpenAPI spec.
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/API-DICT.html
 * DICT (Diretório de Identificadores de Contas Transacionais) API specification.
 */
export const isValidPixPayload = (value: string): boolean => parsePixPayload(value) !== null;
