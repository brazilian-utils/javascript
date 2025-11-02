import { generateChecksum } from '../../helpers';

/**
 * The required length for a valid PIS number (including check digit).
 * @constant {number}
 */
export const LENGTH = 11;

/**
 * Weights used for calculating the PIS check digit.
 * @constant {number[]}
 */
export const WEIGHTS = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * List of reserved PIS numbers that are considered invalid.
 * These are sequential patterns that cannot be valid PIS numbers.
 * @constant {string[]}
 */
export const RESERVED_NUMBERS = [
  '00000000000',
  '11111111111',
  '22222222222',
  '33333333333',
  '44444444444',
  '55555555555',
  '66666666666',
  '77777777777',
  '88888888888',
  '99999999999',
];

/**
 * Checks if the PIS number has the correct length.
 * 
 * @param {string} pis - The PIS number to check
 * @returns {boolean} Returns true if the PIS has exactly 11 digits
 * @private
 */
function isValidLength(pis: string): boolean {
  return pis.length === LENGTH;
}

/**
 * Checks if the PIS number is in the list of reserved (invalid) numbers.
 * 
 * @param {string} pis - The PIS number to check
 * @returns {boolean} Returns true if the PIS is a reserved number
 * @private
 */
function isReservedNumber(pis: string): boolean {
  return RESERVED_NUMBERS.indexOf(pis) >= 0;
}

/**
 * Checks if the PIS string contains only numeric characters.
 * 
 * @param {string} pis - The PIS number to check
 * @returns {boolean} Returns true if the PIS contains only digits (0-9)
 * @private
 */
function hasOnlyNumbers(pis: string): boolean {
  return !!pis.match(/^[0-9]+$/);
}

/**
 * Removes common separator characters from the PIS string.
 * 
 * Removes: spaces, parentheses, dots, commas, asterisks, and hyphens.
 * 
 * @param {string} pis - The PIS number with potential separators
 * @returns {string} The PIS number with all separators removed
 * @private
 */
function removeSeparators(pis: string): string {
  return pis.replace(/[ ().,*-]/g, '');
}

/**
 * Validates a Brazilian PIS (Programa de Integração Social) number.
 * 
 * The validation process checks:
 * - The input is a non-empty string
 * - The length is exactly 11 digits (after removing separators)
 * - The number is not in the reserved numbers list
 * - The string contains only numeric characters
 * - The check digit is mathematically correct using the PIS algorithm
 * 
 * The PIS check digit is calculated using a weighted sum with the formula:
 * checkDigit = 11 - (weightedSum % 11)
 * Special cases: if the result is 10 or 11, the check digit is 0.
 * 
 * @param {string} pis - The PIS number to validate (may include formatting characters)
 * @returns {boolean} Returns true if the PIS number is valid, false otherwise
 * 
 * @example
 * isValid('120.56874.10-7'); // returns true
 * isValid('12056874107');     // returns true
 * isValid('00000000000');     // returns false (reserved number)
 * isValid('123');             // returns false (invalid length)
 * isValid('');                // returns false
 * isValid(null);              // returns false
 */
export function isValid(pis: string): boolean {
  if (!pis || typeof pis !== 'string') return false;

  const numeric = removeSeparators(pis);

  if (!isValidLength(numeric) || isReservedNumber(numeric) || !hasOnlyNumbers(numeric)) return false;

  const weightedChecksum = generateChecksum(numeric.substr(0, numeric.length - 1), WEIGHTS);
  const verifyingDigit = +numeric.charAt(numeric.length - 1);
  const calculatedDigit = 11 - (weightedChecksum % 11);

  return (
    calculatedDigit === verifyingDigit ||
    (calculatedDigit === 10 && verifyingDigit === 0) ||
    (calculatedDigit === 11 && verifyingDigit === 0)
  );
}