import { getNbs } from "../get-nbs/get-nbs";

/**
 * Checks if a value is a code of the official NBS 2.0 table (Nomenclatura Brasileira de
 * Serviços, Intangíveis e Outras Operações que Produzam Variações no Patrimônio), the code the
 * national NFS-e carries in `cNBS`.
 *
 * Accepts what `getNbs` accepts: the 9 digits or the `N.NNNN.NN.NN` mask, with a single
 * separator between the groups and optional surrounding whitespace, or a non-negative safe
 * integer. Only complete codes are valid; the chapter, position and subposition headings of the
 * nomenclature are not.
 *
 * The table is the NBS 2.0 the MDIC publishes. The ANEXO B of the Sistema Nacional NFS-e lists
 * the same codes except three (`1.0402.29.00`, `1.0403.29.00` and `1.0904.40.00`), so a code
 * valid here can still be refused by the NFS-e.
 *
 * @param {string|number} value - The NBS code to be validated.
 * @returns {boolean} True if the code is in the table, false otherwise.
 *
 * @example
 * ```typescript
 * isValidNbs("1.0101.11.00"); // true
 * isValidNbs("101011100"); // true
 * isValidNbs(101011100); // true
 * isValidNbs("1.0101"); // false (a position heading, not a complete code)
 * isValidNbs("1.9999.99.99"); // false
 * ```
 *
 * @see Official: https://www.gov.br/mdic/pt-br/assuntos/sdic/comercio-e-servicos/nbs-nomenclatura-brasileira-de-servicos
 * The NBS page of the MDIC: NBS 2.0, approved by the Portaria Conjunta RFB/SCS 1.429/2018 and
 * amended by the Portaria Conjunta RFB/SCS 2.000/2018.
 * @see Official: https://www.gov.br/mdic/pt-br/images/REPOSITORIO/scs/decos/NBS/NBSa_2-0.csv
 * The NBS 2.0 table in CSV.
 */
export const isValidNbs = (value: string | number): boolean => getNbs(value) !== null;
