import { NBS_DESCRIPTIONS } from "../_internals/constants/nbs";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { isValidNbs } from "../is-valid-nbs/is-valid-nbs";

/**
 * A code of the NBS (Nomenclatura Brasileira de Serviços, Intangíveis e Outras Operações que
 * Produzam Variações no Patrimônio).
 */
export type Nbs = {
	/** The 9 digit code, without the `N.NNNN.NN.NN` mask. */
	code: string;
	/** The official description, as the NBS 2.0 table prints it. */
	description: string;
};

/**
 * Looks an NBS (Nomenclatura Brasileira de Serviços, Intangíveis e Outras Operações que
 * Produzam Variações no Patrimônio) code up in the official NBS 2.0 table, the code the national
 * NFS-e carries in `cNBS`.
 *
 * An NBS code has 9 digits: the digit 1, two of the chapter, two of the position, the two
 * subposition levels, the item and the subitem, printed as `N.NNNN.NN.NN`. Only complete codes
 * are in the table; the chapter (`1.01`), position (`1.0101`) and subposition (`1.0101.1`)
 * headings classify nothing by themselves and give `null`.
 *
 * A string is only read as a code when it is written in one of the documented forms: the 9
 * digits, or the `N.NNNN.NN.NN` mask, with a single separator between the groups and optional
 * surrounding whitespace. Anything else (`"1.0101abc11.00"`) is rejected instead of having its
 * digits picked out. A number is only read as a code when it is a non-negative safe integer.
 * Every code starts with 1, so nothing is padded.
 *
 * @param {string|number} value - The NBS code to look up, with or without the mask, e.g.
 * `"1.0101.11.00"`, `"101011100"` or `101011100`.
 * @returns {Nbs|null} The matching code, or null exactly when `isValidNbs` is false.
 *
 * @example
 * ```typescript
 * getNbs("1.0101.11.00");
 * // { code: "101011100", description: "Serviços de construção de edificações residenciais de um e dois pavimentos" }
 * getNbs(126050000); // { code: "126050000", description: "Serviços domésticos" }
 * getNbs("1.0101"); // null (a position heading, not a complete code)
 * getNbs("1.9999.99.99"); // null
 * ```
 *
 * @see Official: https://www.gov.br/mdic/pt-br/assuntos/sdic/comercio-e-servicos/nbs-nomenclatura-brasileira-de-servicos
 * The NBS page of the MDIC: NBS 2.0, approved by the Portaria Conjunta RFB/SCS 1.429/2018 and
 * amended by the Portaria Conjunta RFB/SCS 2.000/2018, whose Anexo I states how the code is
 * formed ("Formação do código da NBS").
 * @see Official: https://www.gov.br/mdic/pt-br/images/REPOSITORIO/scs/decos/NBS/NBSa_2-0.csv
 * The NBS 2.0 table in CSV, the file `NBS_DESCRIPTIONS` is generated from.
 * @see Official: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual
 * Sistema Nacional NFS-e, `tiposSimples_v1.01.xsd`: `TSCodNBS` is `[0-9]{9}`.
 */
export const getNbs = (value: string | number): Nbs | null => {
	if (!isValidNbs(value)) return null;

	const code = sanitizeToDigits(String(value));

	return { code, description: NBS_DESCRIPTIONS[code] };
};
