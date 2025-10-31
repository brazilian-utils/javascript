import { State, STATES, STATES_DATA } from '../../common/states';

import { isLastChar, onlyNumbers, generateChecksum, generateRandomNumber } from '../../helpers';

export const LENGTH = 11;

export const DOT_INDEXES = [2, 5];

export const HYPHEN_INDEXES = [8];

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

export const CHECK_DIGITS_INDEXES = [9, 10];

export interface FormatCpfOptions {
  pad?: boolean;
}

/**
 * Formats a CPF (Cadastro de Pessoas Físicas) number into the standard Brazilian format.
 * 
 * The function accepts a string or number representing the CPF, removes any non-numeric characters,
 * and applies formatting with dots and hyphens (e.g., `123.456.789-09`). If the `pad` option is set,
 * the CPF will be left-padded with zeros to the required length.
 *
 * @param cpf - The CPF number to format, as a string or number.
 * @param options - Optional formatting options.
 * @param options.pad - If true, pads the CPF with leading zeros to the required length.
 * @returns The formatted CPF string.
 */
export function format(cpf: string | number, options: FormatCpfOptions = {}): string {
  let digits = onlyNumbers(cpf);

  if (options.pad) {
    digits = digits.padStart(LENGTH, '0');
  }

  return digits
    .slice(0, LENGTH)
    .split('')
    .reduce((acc, digit, i) => {
      const result = `${acc}${digit}`;

      if (!isLastChar(i, digits)) {
        if (DOT_INDEXES.indexOf(i) >= 0) return `${result}.`;
        if (HYPHEN_INDEXES.indexOf(i) >= 0) return `${result}-`;
      }

      return result;
    }, '');
}

/**
 * Generates a valid CPF (Brazilian individual taxpayer registry identification) number.
 * 
 * @param state - Optional. The Brazilian state code to generate a CPF for. If provided, must be a valid state code.
 * @returns A string containing a valid 11-digit CPF number.
 * 
 * @remarks
 * The CPF is generated following Brazilian revenue service rules:
 * - First 8 digits are random
 * - 9th digit represents the state code (if provided) or is random
 * - Last 2 digits are check digits calculated using a specific algorithm
 * 
 * @example
 * ```typescript
 * generate(); // returns "12345678901"
 * generate('SP'); // returns "12345678901" (with SP state code)
 * ```
 */
export function generate(state?: State): string {
  const stateCode = state && STATES.includes(state) ? STATES_DATA[state].code : generateRandomNumber(1);
  const baseCPF = generateRandomNumber(LENGTH - 3) + stateCode;

  const firstCheckDigitMod = generateChecksum(baseCPF, 10) % 11;
  const firstCheckDigit = (firstCheckDigitMod < 2 ? 0 : 11 - firstCheckDigitMod).toString();

  const secondCheckDigitMod = generateChecksum(baseCPF + firstCheckDigit, 11) % 11;
  const secondCheckDigit = (secondCheckDigitMod < 2 ? 0 : 11 - secondCheckDigitMod).toString();

  return `${baseCPF}${firstCheckDigit.toString()}${secondCheckDigit.toString()}`;
}

/**
 * Validates if a CPF string matches the expected format.
 * Accepts CPF with or without formatting characters (dots and dash).
 * 
 * @param cpf - The CPF string to be validated
 * @returns True if the CPF string matches the format XXX.XXX.XXX-XX or XXXXXXXXXXX (where X are digits), false otherwise
 * 
 * @example
 * ```typescript
 * isValidFormat('123.456.789-00') // returns true
 * isValidFormat('12345678900') // returns true
 * isValidFormat('123.456.789') // returns false
 * ```
 */
export function isValidFormat(cpf: string): boolean {
  return /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(cpf);
}

/**
 * Checks if a CPF number is a reserved number.
 * @param cpf - The CPF number to check
 * @returns True if the CPF is a reserved number, false otherwise
 * @example
 * ```ts
 * isReservedNumber('11111111111') // returns true
 * isReservedNumber('12345678909') // returns false
 * ```
 */
export function isReservedNumber(cpf: string): boolean {
  return RESERVED_NUMBERS.indexOf(cpf) >= 0;
}

// TODO: move to checksum helper
/**
 * Validates the checksum (verification) digits of a CPF string.
 *
 * This function checks each verification digit position defined in
 * CHECK_DIGITS_INDEXES by recalculating the checksum using generateChecksum
 * and comparing the result against the corresponding character in the input.
 * The checksum algorithm follows the usual CPF rule: compute the weighted sum,
 * take modulo 11, and interpret results less than 2 as digit 0, otherwise use
 * 11 - mod.
 *
 * Important: the function expects `cpf` to be a string of numeric characters
 * containing the full CPF (no dots, spaces or dashes). If the input contains
 * formatting characters, they should be removed before calling this function.
 *
 * @param cpf - The CPF to validate as a string of digits (e.g. "12345678909").
 * @returns True if all verification digits match the calculated checksum; false otherwise.
 *
 * @example
 * // returns true for a correctly formed CPF with valid check digits
 * isValidChecksum("11144477735");
 *
 * @remarks
 * This implementation relies on external values and functions:
 * - CHECK_DIGITS_INDEXES: array of indexes where verification digits are located
 * - generateChecksum: function that computes the weighted sum used in checksum calculation
 */
export function isValidChecksum(cpf: string): boolean {
  return CHECK_DIGITS_INDEXES.every((i) => {
    const mod =
      generateChecksum(
        cpf
          .slice(0, i)
          .split('')
          .reduce((acc, digit) => acc + digit, ''),
        i + 1
      ) % 11;

    return cpf[i] === String(mod < 2 ? 0 : 11 - mod);
  });
}

/**
 * Validates whether a given string is a valid CPF (Brazilian individual taxpayer registry number).
 * 
 * @param cpf - The CPF string to validate
 * @returns `true` if the CPF is valid, `false` otherwise
 * 
 * @remarks
 * A CPF is considered valid when:
 * - It has a valid format
 * - It is not a reserved number
 * - Its checksum digits are valid
 * 
 * @example
 * ```typescript
 * isValid('123.456.789-09'); // returns true or false
 * isValid('12345678909'); // returns true or false
 * ```
 */
export function isValid(cpf: string): boolean {
  if (!cpf || typeof cpf !== 'string') return false;

  const digits = onlyNumbers(cpf);

  return isValidFormat(cpf) && !isReservedNumber(digits) && isValidChecksum(digits);
}
