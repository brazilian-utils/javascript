import {
	SERVICE_ITEM_DESCRIPTIONS,
	SERVICE_ITEM_FORMAT_REGEX,
	SERVICE_ITEM_LENGTH,
} from "../_internals/constants/service-items";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Checks if a value is a subitem in force of the service list annexed to the Lei Complementar
 * 116/2003, the list of the services the ISS is levied on.
 *
 * Accepts the form the law prints (`"1.01"`), a zero padded item (`"01.01"`), the bare digits
 * (`"0101"`, `"101"` or the integer `101`), with optional surrounding whitespace. The dot is the only separator the law ever prints, so `"1-01"` is not
 * valid. Vetoed subitems, item headings, the 6 digit national codes of the NFS-e and item 99 of
 * the national list are not valid.
 *
 * @param {string|number} value - The subitem to be validated.
 * @returns {boolean} True if the subitem is in the list in force, false otherwise.
 *
 * @example
 * ```typescript
 * isValidServiceItem("1.01"); // true
 * isValidServiceItem("0101"); // true
 * isValidServiceItem("17.25"); // true
 * isValidServiceItem("3.01"); // false (vetoed)
 * isValidServiceItem("99.01"); // false (national list only, not the law)
 * ```
 *
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm
 * Lei Complementar 116/2003, "Lista de serviços anexa".
 * @see Official: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual
 * Sistema Nacional NFS-e, `ANEXO_B-NBS2-LISTA_SERVICO_NACIONAL`, sheet `LISTA.SERV.NAC.`: the
 * list in force in machine readable form.
 */
export const isValidServiceItem = (value: string | number): boolean => {
	if (!isLookupCode(value)) return false;

	const written = String(value).trim();

	if (!SERVICE_ITEM_FORMAT_REGEX.test(written)) return false;

	return sanitizeToDigits(written).padStart(SERVICE_ITEM_LENGTH, "0") in SERVICE_ITEM_DESCRIPTIONS;
};
