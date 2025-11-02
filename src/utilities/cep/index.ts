import { isLastChar, onlyNumbers } from '../../helpers';

export const LENGTH = 8;

export const HYPHEN_INDEXES = [4];

/**
 * Checks if the provided CEP (postal code) has a valid length.
 *
 * @param cep - The CEP string to validate.
 * @returns `true` if the CEP length matches the expected `LENGTH`, otherwise `false`.
 */
function isValidLength(cep: string) {
  return cep.length === LENGTH;
}

/**
 * Formats a Brazilian CEP (postal code) string by inserting hyphens at specific positions.
 * Only numeric characters from the input are considered.
 *
 * @param cep - The input CEP string to be formatted.
 * @returns The formatted CEP string with hyphens.
 */
export function format(cep: string): string {
  const digits = onlyNumbers(cep);

  return digits
    .slice(0, LENGTH)
    .split('')
    .reduce((acc, digit, i) => {
      const result = `${acc}${digit}`;

      if (!isLastChar(i, digits)) {
        if (HYPHEN_INDEXES.indexOf(i) >= 0) return `${result}-`;
      }

      return result;
    }, '');
}

/**
 * Checks if a given CEP (Brazilian postal code) is valid.
 *
 * The function validates the input by ensuring it is a string,
 * extracts only the numeric digits, and verifies if the length
 * matches the expected format for a CEP.
 *
 * @param cep - The CEP value to validate.
 * @returns `true` if the CEP is valid, otherwise `false`.
 */
export function isValid(cep: string) {
  if (!cep || typeof cep !== 'string') return false;

  const digits = onlyNumbers(cep);

  return isValidLength(digits);
}
