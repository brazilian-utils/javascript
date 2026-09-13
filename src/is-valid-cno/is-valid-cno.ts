import { isValidCeiCnoNumber } from "../_internals/is-valid-cei-cno-number/is-valid-cei-cno-number";

/**
 * Validates a CNO (Cadastro Nacional de Obras) number, the registration of a construction work
 * with the Receita Federal.
 *
 * The CNO replaced the CEI for construction works and kept its numbering: 12 digits printed as
 * "00.000.00000/00", the last one being a check digit calculated over the 11 base digits with
 * the weights 7, 4, 1, 8, 5, 2, 1, 6, 3, 7 and 4. A work registered under a legacy CEI keeps
 * the same number in the CNO, so both registries validate identically.
 *
 * The value has to be written as the 12 digits, optionally split into the printed groups of 2,
 * 3, 5 and 2 by whitespace or the usual mask characters, a run of them between two groups
 * included; anything else, a letter among the digits included, is rejected instead of being
 * read past.
 *
 * The Receita Federal does not publish the check digit rule of the CEI/CNO numbering, so the
 * calculation follows the reference implementations cited below, cross-checked against the CNO
 * open data of the Receita Federal.
 *
 * @param {string|number} value - The CNO value to be validated.
 * @returns {boolean} True if the CNO is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCno("11.084.01680/62"); // true
 * isValidCno("111130137368"); // true
 * isValidCno(401800097960); // true
 * isValidCno("110840168063"); // false (invalid check digit)
 * isValidCno("000000000000"); // false (repeated digits)
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cno
 * The registry's own page at the Receita Federal, which describes the cadastro but publishes
 * neither the mask nor the check digit rule.
 * @see Official: https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-de-obras-cno
 * Cadastro Nacional de Obras (CNO), dados abertos da Receita Federal: every one of the 38432
 * works registered in Minas Gerais passes this check, which is what ties the CNO to the CEI
 * rule and where the test vectors come from.
 * @see Based on: https://github.com/yiibr/yii2-br-validator/blob/master/src/CeiValidator.php
 * PHP reference implementation of the CEI check digit.
 */
export const isValidCno = (value: string | number): boolean => isValidCeiCnoNumber(value);
