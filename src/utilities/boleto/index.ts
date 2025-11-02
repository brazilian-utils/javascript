/**
 * Constants and utility functions for validating and formatting Brazilian bank slip (boleto) numbers.
 * @module boleto
 */
import { onlyNumbers, isLastChar } from '../../helpers';

export const PARTIALS = [
  {
    end: 9,
    start: 0,
    index: 9,
  },
  {
    end: 20,
    start: 10,
    index: 20,
  },
  {
    end: 31,
    start: 21,
    index: 31,
  },
];

export const DOT_INDEXES = [4, 14, 25];

export const SPACE_INDEXES = [9, 20, 31, 32];

export const LENGTH = 47;

export const CHECK_DIGIT_POSITION = 4;

export const MOD_11_WEIGHTS = {
  end: 9,
  initial: 2,
};

export const MOD_10_WEIGHTS = [2, 1];

export const DIGITABLE_LINE_TO_BOLETO_CONVERT_POSITIONS = [
  { end: 4, start: 0 },
  { end: 47, start: 32 },
  { end: 9, start: 4 },
  { end: 20, start: 10 },
  { end: 31, start: 21 },
];

function isValidLength(digitableLine: string): boolean {
  return digitableLine.length === LENGTH;
}

/**
 * Calculates the modulus 10 check digit for a given partial string.
 * @param partial - The partial string to calculate the check digit for.
 * @returns The calculated check digit.
 */
function mod10(partial: string): number {
  const sum = partial
    .split('')
    .reverse()
    .reduce((acc, digit, index) => {
      const result = parseInt(digit, 10) * MOD_10_WEIGHTS[index % 2];

      return acc + (result > 9 ? 1 + (result % 10) : result);
    }, 0);

  const mod = sum % 10;

  return mod > 0 ? 10 - mod : 0;
}

/**
 * Calculates the modulus 11 check digit for a given value.
 * @param value - The value to calculate the check digit for.
 * @returns The calculated check digit.
 */
function mod11(value: string): number {
  const { initial, end } = MOD_11_WEIGHTS;

  let weight = initial;

  const sum = value
    .split('')
    .reverse()
    .reduce((acc, digit) => {
      const result = parseInt(digit, 10) * weight;
      weight = weight < end ? weight + 1 : initial;

      return acc + result;
    }, 0);

  const mod = sum % 11;

  return mod === 0 || mod === 1 ? 1 : 11 - mod;
}

/**
 * Validates if all partial sections of the digitable line have correct check digits.
 * @param digitableLine - The digitable line to validate.
 * @returns True if all partials are valid, false otherwise.
 */
function isValidPartials(digitableLine: string): boolean {
  return PARTIALS.every(({ start, end, index }) => {
    const mod = mod10(digitableLine.substring(start, end));

    return +digitableLine[index] === mod;
  });
}

/**
 * Converts a digitable line to a boleto number format.
 * @param digitableLine - The digitable line to parse.
 * @returns The parsed boleto number.
 */
function parse(digitableLine: string): string {
  return DIGITABLE_LINE_TO_BOLETO_CONVERT_POSITIONS.reduce(
    (acc, pos) => acc + digitableLine.substring(pos.start, pos.end),
    ''
  );
}

/**
 * Validates if the check digit of the parsed digitable line is correct.
 * @param parsedDigitableLine - The parsed digitable line to validate.
 * @returns True if the check digit is valid, false otherwise.
 */
function isValidCheckDigit(parsedDigitableLine: string): boolean {
  const mod = mod11(
    parsedDigitableLine.slice(0, CHECK_DIGIT_POSITION) + parsedDigitableLine.slice(CHECK_DIGIT_POSITION + 1)
  );

  return +parsedDigitableLine[CHECK_DIGIT_POSITION] === mod;
}

/**
 * Validates if a Brazilian bank slip (boleto) number is valid.
 * Performs several validations including length check, partial validations,
 * and check digit verification.
 * @param digitableLine - The bank slip number to validate.
 * @returns True if the bank slip number is valid, false otherwise.
 * @example
 * isValid('23790123016000000005325000456708') // returns true
 * isValid('23790123016000000005325000456709') // returns false
 */
export function isValid(digitableLine: string): boolean {
  if (!digitableLine || typeof digitableLine !== 'string') return false;

  const digits = onlyNumbers(digitableLine);

  if (!isValidLength(digits)) return false;

  if (!isValidPartials(digits)) return false;

  const parsedDigits = parse(digits);

  return isValidCheckDigit(parsedDigits);
}

/**
 * Formats a boleto (Brazilian bank slip) number string by adding dots and spaces at specific positions.
 * 
 * @param boleto - The boleto number string to be formatted. Can contain numbers and other characters.
 * @returns A formatted string containing only numbers with dots and spaces at standardized positions.
 * 
 * @example
 * ```typescript
 * format('23790123016000000005325000456708') 
 * // returns '23790.12301 60000.000053 25000.456708'
 * ```
 */
export function format(boleto: string) {
  const digits = onlyNumbers(boleto);

  return digits
    .slice(0, LENGTH)
    .split('')
    .reduce((acc, digit, index) => {
      const result = `${acc}${digit}`;

      if (!isLastChar(index, digits)) {
        if (DOT_INDEXES.indexOf(index) >= 0) return `${result}.`;
        if (SPACE_INDEXES.indexOf(index) >= 0) return `${result} `;
      }

      return result;
    }, '');
}
