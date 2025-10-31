import { onlyNumbers, isLastChar } from '../../helpers';

/**
 * The required length for a valid Processo Jurídico number.
 * @constant {number}
 */
export const LENGTH = 20;

/**
 * Positions where dots should be placed in the formatted Processo Jurídico.
 * @constant {number[]}
 */
export const DOT_INDEXES = [8, 12, 15];

/**
 * Positions where hyphens should be placed in the formatted Processo Jurídico.
 * @constant {number[]}
 */
export const HYPHEN_INDEXES = [6];

/**
 * Starting position of the check digits in the Processo Jurídico number.
 * @constant {number}
 */
export const CHECK_DIGIT_START_POSITION = 7;

/**
 * Length of the check digit sequence.
 * @constant {number}
 */
export const CHECK_DIGIT_LENGTH = 2;

/**
 * Quotient used in the MOD 97-10 algorithm for check digit calculation.
 * @constant {number}
 */
export const MOD_97_10_QUOCIENT = 97;

/**
 * Sum value used in the MOD 97-10 algorithm for check digit calculation.
 * Formula: mod(98 - mod(data * 100, 97), 97)
 * @constant {number}
 */
export const MOD_97_10_SUM = 98;

/**
 * Formats a Processo Jurídico number with the standard Brazilian court case format.
 * 
 * The standard format is: NNNNNNN-DD.AAAA.J.TT.OOOO
 * Where:
 * - NNNNNNN: Sequential number
 * - DD: Check digits
 * - AAAA: Year
 * - J: Judicial segment
 * - TT: Court
 * - OOOO: Origin
 * 
 * @param {string} processoJuridico - The Processo Jurídico number to format (with or without separators)
 * @returns {string} The formatted Processo Jurídico with dots and hyphens
 * 
 * @example
 * format('12345678901234567890'); // returns '1234567-89.0123.4.56.7890'
 * format('1234567890123456');     // returns '1234567-89.0123.4.56'
 */
export function format(processoJuridico: string) {
  const digits = onlyNumbers(processoJuridico);

  return digits
    .slice(0, LENGTH)
    .split('')
    .reduce((acc, digit, index) => {
      const result = `${acc}${digit}`;
      if (!isLastChar(index, processoJuridico)) {
        if (DOT_INDEXES.includes(index)) return `${result}.`;
        if (HYPHEN_INDEXES.includes(index)) return `${result}-`;
      }
      return result;
    }, '');
}

/**
 * Verifies the check digits of a Processo Jurídico using the MOD 97-10 algorithm.
 * 
 * The verification process:
 * 1. Extracts the two check digits (positions 7-8)
 * 2. Calculates the first remainder using digits 1-11 with their positional weights
 * 3. Calculates the second remainder using the first remainder and digits 12-18
 * 4. Computes the verifier: 98 - secondRemainder
 * 5. Compares the computed verifier with the actual check digits
 * 
 * This implements the MOD 97-10 formula: mod(98 - mod(data * 100, 97), 97)
 * 
 * @param {string} processo - The Processo Jurídico number (digits only, no separators)
 * @returns {boolean} Returns true if the check digits are valid
 * @private
 */
export function verifyDigit(processo: string): boolean {
  const digits = processo.split('');
  const verificationDigits = digits.splice(CHECK_DIGIT_START_POSITION, CHECK_DIGIT_LENGTH).join('');

  const digits1to11 = digits.slice(0, 11).reduce((acc, digit, index) => {
    return acc + +digit * Math.pow(10, 10 - index);
  }, 0);

  const firstRemainder = digits1to11 % MOD_97_10_QUOCIENT;

  const digits12to18 = digits.slice(11).reduce((acc, digit, index) => {
    return acc + +digit * Math.pow(10, 6 - index);
  }, 0);

  const secondRemainder = (firstRemainder * 1_000_000_000 + digits12to18 * 100) % MOD_97_10_QUOCIENT;

  const verifier = MOD_97_10_SUM - secondRemainder;
  return verifier === +verificationDigits;
}

/**
 * Validates a Brazilian Processo Jurídico (court case) number.
 * 
 * The validation process checks:
 * - The input is a non-empty string
 * - The length is exactly 20 digits (after removing separators)
 * - The check digits are mathematically correct using the MOD 97-10 algorithm
 * 
 * The Processo Jurídico follows the CNJ (Conselho Nacional de Justiça) standard
 * format established by Resolution 65/2008.
 * 
 * @param {string} processoJuridico - The Processo Jurídico number to validate (may include formatting characters)
 * @returns {boolean} Returns true if the Processo Jurídico number is valid, false otherwise
 * 
 * @example
 * isValid('1234567-89.0123.4.56.7890'); // returns true/false based on check digits
 * isValid('12345678901234567890');      // returns true/false based on check digits
 * isValid('123');                       // returns false (invalid length)
 * isValid('');                          // returns false
 * isValid(null);                        // returns false
 */
export function isValid(processoJuridico: string): boolean {
  if (!processoJuridico || typeof processoJuridico !== 'string') return false;
  const digits = onlyNumbers(processoJuridico);

  if (digits.length !== LENGTH) {
    return false;
  }

  return verifyDigit(digits);
}