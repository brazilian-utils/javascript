import {
	SERVICE_ITEM_DESCRIPTIONS,
	SERVICE_ITEM_FORMAT_REGEX,
} from "../_internals/constants/service-items";
import { isLookupCode } from "../_internals/is-lookup-code/is-lookup-code";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

const SUBITEM_LENGTH = 4;

const ITEM_LENGTH = 2;

/** A subitem of the service list annexed to the Lei Complementar 116/2003. */
export type ServiceItem = {
	/** The subitem as the law numbers it, e.g. `"1.01"` or `"17.25"`. */
	code: string;
	/** The description of the subitem, as the list in force prints it. */
	description: string;
};

/**
 * Looks a subitem up in the service list annexed to the Lei Complementar 116/2003, the list of
 * the services the ISS is levied on.
 *
 * The law numbers a subitem as the item, a dot and two digits, `1.01` to `40.01`. It is accepted
 * in that form, with a zero padded item (`"01.01"`) or as the bare digits (`"0101"`, `"101"`),
 * which are the first four digits of the `cTribNac` code of the national NFS-e, and optional
 * surrounding whitespace. The dot is the only separator the law ever prints between the item and
 * the subitem, so unlike the codes with a printed grouping mask (`getCfop`, `getNbs`) nothing
 * else is accepted in its place and `"1-01"` gives `null`. A number is only read when it is a
 * non-negative safe integer, so `101` is `1.01` while the float `1.01` gives `null`: write the
 * dotted form as a string.
 *
 * Only the subitems in force are in the table. The vetoed ones (`3.01`, `7.14`, `7.15`, `13.01`
 * and `17.07`) give `null`, and so do the item headings (`"1"`), the national codes a subitem is
 * split into (`"010101"`) and item 99 of the national list, which is not part of the law.
 * Municipal service codes are out of scope.
 *
 * @param {string|number} value - The subitem to look up, e.g. `"1.01"`, `"01.01"`, `"0101"` or
 * `101`.
 * @returns {ServiceItem|null} The matching subitem, or null when it is unknown or invalid.
 *
 * @example
 * ```typescript
 * getServiceItem("1.01"); // { code: "1.01", description: "Análise e desenvolvimento de sistemas." }
 * getServiceItem("0101"); // { code: "1.01", description: "Análise e desenvolvimento de sistemas." }
 * getServiceItem("40.01"); // { code: "40.01", description: "Obras de arte sob encomenda." }
 * getServiceItem("3.01"); // null (vetoed)
 * getServiceItem(1.01); // null (not a non-negative safe integer)
 * ```
 *
 * @see Official: https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm
 * Lei Complementar 116/2003, "Lista de serviços anexa".
 * @see Official: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual
 * Sistema Nacional NFS-e, `ANEXO_B-NBS2-LISTA_SERVICO_NACIONAL`, sheet `LISTA.SERV.NAC.`: the
 * list in force in machine readable form, which `SERVICE_ITEM_DESCRIPTIONS` is generated from,
 * and `TSCodTribNac` of `tiposSimples_v1.01.xsd`, "2 para Item (LC 116/2003), 2 para Subitem (LC
 * 116/2003) e 2 para Desdobro Nacional".
 */
export const getServiceItem = (value: string | number): ServiceItem | null => {
	if (!isLookupCode(value)) return null;

	const written = String(value).trim();

	if (!SERVICE_ITEM_FORMAT_REGEX.test(written)) return null;

	const digits = sanitizeToDigits(written).padStart(SUBITEM_LENGTH, "0");
	const description = SERVICE_ITEM_DESCRIPTIONS[digits];

	if (description === undefined) return null;

	return {
		code: `${Number(digits.slice(0, ITEM_LENGTH))}.${digits.slice(ITEM_LENGTH)}`,
		description,
	};
};
