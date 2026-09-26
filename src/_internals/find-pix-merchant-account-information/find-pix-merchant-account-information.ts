import {
	PIX_GUI,
	PIX_GUI_ID,
	PIX_MERCHANT_ACCOUNT_INFORMATION_FIRST_ID,
	PIX_MERCHANT_ACCOUNT_INFORMATION_LAST_ID,
} from "../constants/pix";
import { type TlvFields, parseTlv } from "../parse-tlv/parse-tlv";

/**
 * Finds the Pix "Merchant Account Information" template of a BR Code: the first of the
 * templates with IDs 26 to 51 that is well-formed TLV and carries the `br.gov.bcb.pix` GUI in
 * its object `00`, compared without regard to letter case. Shared by `isValidPixPayload`, which
 * checks the key or URL it holds, and `getPixPayloadInfo`, which reads them.
 *
 * @param {TlvFields} fields - The root objects of the BR Code.
 * @returns {TlvFields|null} The objects of the Pix template, or `null` when there is none.
 * @see Official: https://www.bcb.gov.br/content/estabilidadefinanceira/spb_docs/ManualBRCode.pdf
 */
export const findPixMerchantAccountInformation = (fields: TlvFields): TlvFields | null => {
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
