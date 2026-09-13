/**
 * Layout of the CAEPF (Cadastro de Atividade Econômica da Pessoa Física): 14 digits printed as
 * "000.000.000/000-00", the first 9 being the CPF base of the holder, the next 3 the sequence
 * of the holder's registrations and the last 2 the check digits.
 *
 * The weights below are the CNPJ's modulus 11 in the formulation of the cited reference: read
 * from the right they cycle from 9 down to 2, and the check digit is the remainder itself, with
 * a remainder of 10 read as 0 — the same digit the CNPJ's 2-to-9 weights with `11 - remainder`
 * produce.
 *
 * The Receita Federal does not publish the check digit rule of the CAEPF, the shift of 12
 * included, so the calculation follows the reference implementations cited below.
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/caepf
 * The registry's own page at the Receita Federal, which describes the cadastro but publishes
 * neither the 14 digit layout nor the check digit rule.
 * @see Based on: http://ghiorzi.org/DVnew.htm Description of the CAEPF layout and of the
 * shift of 12 applied to the check digit pair.
 * @see Based on: https://github.com/VitorLuizC/brazilian-values/blob/master/src/validators/isCAEPF.ts
 * Reference implementation agreeing on the weights and on the shift.
 */

export const CAEPF_BASE_LENGTH = 12;

export const CAEPF_FIRST_WEIGHTS = [6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9];

export const CAEPF_SECOND_WEIGHTS = [5, 6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9];

export const CAEPF_CHECK_DIGITS_OFFSET = 12;

export const CAEPF_FORMAT_REGEX = /^\d{3}[\s.\-/]*\d{3}[\s.\-/]*\d{3}[\s.\-/]*\d{3}[\s.\-/]*\d{2}$/;
