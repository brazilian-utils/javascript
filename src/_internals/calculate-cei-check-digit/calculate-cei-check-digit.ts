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
 * @see Official: Cadastro Nacional de Obras (CNO), dados abertos da Receita Federal: the
 * 38432 works registered in Minas Gerais confirm the rule, and their check digits of 0 are
 * what shows that a computed 10 maps back to 0, which neither reference implementation does.
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
