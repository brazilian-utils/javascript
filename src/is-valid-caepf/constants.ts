/**
 * Layout of the CAEPF (Cadastro de Atividade Econômica da Pessoa Física): 14 digits printed as
 * "000.000.000/000-00", the first 9 being the CPF base of the holder, the next 3 the sequence
 * of the holder's registrations and the last 2 the check digits.
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/caepf
 * @see Based on: http://ghiorzi.org/DVnew.htm Description of the CAEPF layout and of the
 * shift of 12 applied to the check digit pair.
 * @see Based on: https://github.com/VitorLuizC/brazilian-values/blob/master/src/validators/isCAEPF.ts
 * Reference implementation agreeing on the weights and on the shift.
 */

export const CAEPF_LENGTH = 14;

export const CAEPF_BASE_LENGTH = 12;

export const CAEPF_FIRST_WEIGHTS = [6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9];

export const CAEPF_SECOND_WEIGHTS = [5, 6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9];

export const CAEPF_CHECK_DIGITS_OFFSET = 12;

export const CAEPF_FORMAT_REGEX = /^\d{3}[\s.\-/]*\d{3}[\s.\-/]*\d{3}[\s.\-/]*\d{3}[\s.\-/]*\d{2}$/;
