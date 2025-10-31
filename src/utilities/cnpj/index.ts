import { isLastChar, onlyNumbers, generateChecksum, generateRandomNumber } from '../../helpers';

export const LENGTH = 14;

export const DOT_INDEXES = [1, 4];

export const SLASH_INDEXES = [7];

export const HYPHEN_INDEXES = [11];

export const RESERVED_NUMBERS = [
  '00000000000000',
  '11111111111111',
  '22222222222222',
  '33333333333333',
  '44444444444444',
  '55555555555555',
  '66666666666666',
  '77777777777777',
  '88888888888888',
  '99999999999999',
];

export const CHECK_DIGITS_INDEXES = [12, 13];

export const FIRST_CHECK_DIGIT_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export const SECOND_CHECK_DIGIT_WEIGHTS = [6].concat(FIRST_CHECK_DIGIT_WEIGHTS);

export interface FormatCnpjOptions {
  pad?: boolean;
}

/**
 * Formats a CNPJ (Cadastro Nacional da Pessoa Jurídica) number according to Brazilian standards.
 *
 * The function removes all non-numeric characters from the input, optionally pads the number to the required length,
 * and inserts formatting characters (dots, slashes, hyphens) at the appropriate positions.
 *
 * @param cnpj - The CNPJ number to format, as a string or number.
 * @param options - Optional formatting options.
 *   @property pad - If true, pads the CNPJ with leading zeros to the required length.
 * @returns The formatted CNPJ string.
 */
export function format(cnpj: string | number, options: FormatCnpjOptions = {}): string {
  let digits = onlyNumbers(cnpj);

  if (options.pad) {
    digits = digits.padStart(LENGTH, '0');
  }

  return digits
    .slice(0, LENGTH)
    .split('')
    .reduce((acc, digit, index) => {
      const result = `${acc}${digit}`;

      if (!isLastChar(index, digits)) {
        if (DOT_INDEXES.includes(index)) return `${result}.`;
        if (SLASH_INDEXES.includes(index)) return `${result}/`;
        if (HYPHEN_INDEXES.includes(index)) return `${result}-`;
      }

      return result;
    }, '');
}

/**
 * Generates a valid CNPJ (Cadastro Nacional da Pessoa Jurídica) number as a string.
 * The generated CNPJ includes both check digits calculated according to official rules.
 *
 * @returns {string} A valid CNPJ number as a string.
 */
export function generate(): string {
  const baseCNPJ = generateRandomNumber(LENGTH - 2);

  const firstCheckDigitMod = generateChecksum(baseCNPJ, FIRST_CHECK_DIGIT_WEIGHTS) % 11;
  const firstCheckDigit = (firstCheckDigitMod < 2 ? 0 : 11 - firstCheckDigitMod).toString();

  const secondCheckDigitMod = generateChecksum(baseCNPJ + firstCheckDigit, SECOND_CHECK_DIGIT_WEIGHTS) % 11;
  const secondCheckDigit = (secondCheckDigitMod < 2 ? 0 : 11 - secondCheckDigitMod).toString();

  return `${baseCNPJ}${firstCheckDigit}${secondCheckDigit}`;
}

/**
 * Checks if the provided CNPJ string matches the valid format.
 *
 * The valid format is: `NN.NNN.NNN/NNNN-NN` where `N` is a digit.
 * Dots, slashes, and hyphens are optional.
 *
 * @param cnpj - The CNPJ string to validate.
 * @returns `true` if the CNPJ matches the expected format, otherwise `false`.
 */
export function isValidFormat(cnpj: string): boolean {
  return /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(cnpj);
}

/**
 * Checks if the given CPF number is a reserved number.
 *
 * Reserved numbers are typically sequences of repeated digits (e.g., "00000000000", "11111111111", etc.)
 * that are not valid for real CPF registrations.
 *
 * @param cpf - The CPF number as a string to be checked.
 * @returns `true` if the CPF is a reserved number, otherwise `false`.
 */
export function isReservedNumber(cpf: string): boolean {
  return RESERVED_NUMBERS.indexOf(cpf) >= 0;
}

// TODO: move to checksum helper
/**
 * Checks if the provided CNPJ string has a valid checksum according to Brazilian CNPJ rules.
 *
 * The function uses predefined weights and indexes to calculate and validate the check digits.
 * It iterates through the check digit indexes, adjusts the weights as needed, and compares
 * the calculated check digit with the corresponding digit in the CNPJ.
 *
 * @param cnpj - The CNPJ string to validate.
 * @returns `true` if the CNPJ has a valid checksum, `false` otherwise.
 */
export function isValidChecksum(cnpj: string): boolean {
  const weights = FIRST_CHECK_DIGIT_WEIGHTS.slice();

  return CHECK_DIGITS_INDEXES.every((i) => {
    if (i === CHECK_DIGITS_INDEXES[CHECK_DIGITS_INDEXES.length - 1]) {
      weights.unshift(6);
    }

    const mod =
      generateChecksum(
        cnpj
          .slice(0, i)
          .split('')
          .reduce((acc, digit) => acc + digit, ''),
        weights
      ) % 11;

    return cnpj[i] === String(mod < 2 ? 0 : 11 - mod);
  });
}

/**
 * Checks if a given CNPJ (Cadastro Nacional da Pessoa Jurídica) string is valid.
 *
 * The validation includes:
 * - Ensuring the input is a non-empty string.
 * - Verifying the format of the CNPJ.
 * - Checking that the CNPJ is not a reserved number.
 * - Validating the checksum digits.
 *
 * @param cnpj - The CNPJ string to validate.
 * @returns `true` if the CNPJ is valid, otherwise `false`.
 */
export function isValid(cnpj: string): boolean {
  if (!cnpj || typeof cnpj !== 'string') return false;

  const numbers = onlyNumbers(cnpj);

  return isValidFormat(cnpj) && !isReservedNumber(numbers) && isValidChecksum(numbers);
}
