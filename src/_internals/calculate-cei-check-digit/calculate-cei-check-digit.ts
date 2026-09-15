import { CEI_WEIGHTS } from "../constants/cei";
import { generateChecksum } from "../generate-checksum/generate-checksum";

/**
 * Calculates the check digit of a CEI (Cadastro Específico do INSS) base, the same digit the
 * CNO (Cadastro Nacional de Obras) kept when it replaced the CEI numbering.
 *
 * The 11 base digits are weighted by 7, 4, 1, 8, 5, 2, 1, 6, 3, 7 and 4 from left to right.
 * The tens part and the units part of that sum are added together and the check digit is the
 * complement of the units digit of the result to 10, with 10 mapped back to 0.
 *
 * The Receita Federal does not publish the check digit rule of the CEI/CNO numbering, so the
 * calculation follows the reference implementations cited below, cross-checked against the CNO
 * open data of the Receita Federal.
 *
 * @param {string} base - The 11 digits that precede the check digit.
 * @returns {number} The check digit, 0 to 9.
 *
 * @example
 * ```typescript
 * calculateCeiCheckDigit("11583002498"); // 5
 * calculateCeiCheckDigit("40180009796"); // 0
 * ```
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cno
 * The registry's own page at the Receita Federal, which describes the cadastro but publishes
 * neither the mask nor the check digit rule.
 * @see Official: https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-de-obras-cno
 * Cadastro Nacional de Obras (CNO), dados abertos da Receita Federal: the catalogue entry for the
 * dataset this rule was cross-checked against. The Minas Gerais extract of the downloaded dataset
 * confirms the rule, and the works whose check digit is 0 are what shows that a computed 10 maps
 * back to 0, which neither reference implementation does; the catalogue page itself publishes only
 * the dataset's description and download links (and currently flags it "Desatualizado").
 * @see Based on: https://github.com/yiibr/yii2-br-validator/blob/master/src/CeiValidator.php
 * PHP reference implementation of the CEI check digit.
 * @see Based on: https://github.com/marcos-cruz/Documento/blob/master/src/Bigai.Documentos.Brasil/Cei/Cei.cs
 * Second, independent reference implementation agreeing with the first.
 */
export const calculateCeiCheckDigit = (base: string): number => {
	const sum = generateChecksum({ base, weight: CEI_WEIGHTS });
	const folded = Math.floor(sum / 10) + (sum % 10);

	return (10 - (folded % 10)) % 10;
};
