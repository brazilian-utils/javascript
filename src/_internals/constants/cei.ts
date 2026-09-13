/**
 * Numbering shared by the CEI (Cadastro Específico do INSS) and by the CNO (Cadastro Nacional
 * de Obras) that replaced it: 12 digits printed as "00.000.00000/00".
 *
 * The Receita Federal does not publish the check digit rule of the CEI/CNO numbering, so the
 * calculation follows the reference implementations cited below, cross-checked against the CNO
 * open data of the Receita Federal.
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
 * @see Based on: https://github.com/marcos-cruz/Documento/blob/master/src/Bigai.Documentos.Brasil/Cei/Cei.cs
 * Second, independent reference implementation agreeing with the first.
 */

export const CEI_BASE_LENGTH = 11;

export const CEI_WEIGHTS = [7, 4, 1, 8, 5, 2, 1, 6, 3, 7, 4];

/**
 * Shape a CEI/CNO number has to be written in: the 12 digits, optionally split into the printed
 * groups of 2, 3, 5 and 2 by whitespace or the usual mask characters. A run of separators is
 * tolerated between two groups, not just a single one, which is what the CPF, CNPJ, CAEPF and
 * certidão regexes of this library do.
 */
export const CEI_FORMAT_REGEX = /^\d{2}[\s.\-/]*\d{3}[\s.\-/]*\d{5}[\s.\-/]*\d{2}$/;

export const CEI_PATTERN = "00.000.00000/00";
