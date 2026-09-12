/**
 * Numbering shared by the CEI (Cadastro Específico do INSS) and by the CNO (Cadastro Nacional
 * de Obras) that replaced it: 12 digits printed as "00.000.00000/00".
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cno
 * @see Based on: https://github.com/yiibr/yii2-br-validator/blob/master/src/CeiValidator.php
 * PHP reference implementation of the CEI check digit.
 * @see Based on: https://github.com/marcos-cruz/Documento/blob/master/src/Bigai.Documentos.Brasil/Cei/Cei.cs
 * Second, independent reference implementation agreeing with the first.
 */

export const CEI_LENGTH = 12;

export const CEI_BASE_LENGTH = 11;

export const CEI_WEIGHTS = [7, 4, 1, 8, 5, 2, 1, 6, 3, 7, 4];

export const CEI_FORMAT_REGEX = /^\d{2}[\s.\-/]*\d{3}[\s.\-/]*\d{5}[\s.\-/]*\d{2}$/;
