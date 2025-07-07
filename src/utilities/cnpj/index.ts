import { isLastChar, generateChecksum, generateRandomNumber } from '../../helpers';

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

export const SECOND_CHECK_DIGIT_WEIGHTS = [6, ...FIRST_CHECK_DIGIT_WEIGHTS];

export const VALID_CNPJ_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const CNPJ_FORMAT_REGEX = /^[0-9A-Z]{2}\.?[0-9A-Z]{3}\.?[0-9A-Z]{3}\/?[0-9A-Z]{4}-?[0-9]{2}$/;

export const NUMERIC_CNPJ_REGEX = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/;

export interface FormatCnpjOptions {
  pad?: boolean;
}

export function charToCnpjValue(char: string): number {
  return char.charCodeAt(0) - 48;
}

export function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

export function isNumericCnpj(cnpj: string): boolean {
  return /^\d+$/.test(cleanCnpj(cnpj));
}

export function isAlphanumericCnpj(cnpj: string): boolean {
  const cleaned = cleanCnpj(cnpj);
  return cleaned.length === LENGTH && /[A-Z]/.test(cleaned);
}

export function format(cnpj: string | number, options: FormatCnpjOptions = {}): string {
  let digits = cleanCnpj(cnpj.toString());

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

export function generateRandomCnpjChar(): string {
  return VALID_CNPJ_CHARS[Math.floor(Math.random() * VALID_CNPJ_CHARS.length)];
}

export function generateAlphanumericCnpjBase(): string {
  let base = '';
  for (let i = 0; i < 12; i++) {
    base += generateRandomCnpjChar();
  }
  return base;
}

export function generateAlphanumericChecksum(cnpj: string, weights: number[]): number {
  return cnpj.split('').reduce((sum, char, idx) => sum + charToCnpjValue(char) * weights[idx], 0);
}

export function generate(): string {
  const baseCNPJ = generateRandomNumber(LENGTH - 2);

  const firstCheckDigitMod = generateChecksum(baseCNPJ, FIRST_CHECK_DIGIT_WEIGHTS) % 11;
  const firstCheckDigit = (firstCheckDigitMod < 2 ? 0 : 11 - firstCheckDigitMod).toString();

  const secondCheckDigitMod = generateChecksum(baseCNPJ + firstCheckDigit, SECOND_CHECK_DIGIT_WEIGHTS) % 11;
  const secondCheckDigit = (secondCheckDigitMod < 2 ? 0 : 11 - secondCheckDigitMod).toString();

  return `${baseCNPJ}${firstCheckDigit}${secondCheckDigit}`;
}

export function generateAlphanumeric(): string {
  const baseCNPJ = generateAlphanumericCnpjBase();

  const firstCheckDigitMod = generateAlphanumericChecksum(baseCNPJ, FIRST_CHECK_DIGIT_WEIGHTS) % 11;
  const firstCheckDigit = (firstCheckDigitMod < 2 ? 0 : 11 - firstCheckDigitMod).toString();

  const secondCheckDigitMod = generateAlphanumericChecksum(baseCNPJ + firstCheckDigit, SECOND_CHECK_DIGIT_WEIGHTS) % 11;
  const secondCheckDigit = (secondCheckDigitMod < 2 ? 0 : 11 - secondCheckDigitMod).toString();

  return `${baseCNPJ}${firstCheckDigit}${secondCheckDigit}`;
}

export function isValidFormat(cnpj: string): boolean {
  return CNPJ_FORMAT_REGEX.test(cnpj);
}

export function isValidNumericFormat(cnpj: string): boolean {
  return NUMERIC_CNPJ_REGEX.test(cnpj);
}

export function isReservedNumber(cnpj: string): boolean {
  const cleaned = cleanCnpj(cnpj);
  return RESERVED_NUMBERS.indexOf(cleaned) >= 0;
}

export function isValidAlphanumericChecksum(cnpj: string): boolean {
  const cleaned = cleanCnpj(cnpj);
  const weights = [...FIRST_CHECK_DIGIT_WEIGHTS];

  return CHECK_DIGITS_INDEXES.every((i) => {
    if (i === CHECK_DIGITS_INDEXES[CHECK_DIGITS_INDEXES.length - 1]) {
      weights.unshift(6);
    }

    const mod =
      generateAlphanumericChecksum(
        cleaned
          .slice(0, i)
          .split('')
          .reduce((acc, digit) => acc + digit, ''),
        weights
      ) % 11;

    return cleaned[i] === String(mod < 2 ? 0 : 11 - mod);
  });
}

// TODO: move to checksum helper
export function isValidChecksum(cnpj: string): boolean {
  const weights = [...FIRST_CHECK_DIGIT_WEIGHTS];

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

export function isValid(cnpj: string): boolean {
  if (!cnpj || typeof cnpj !== 'string') return false;

  const cleaned = cleanCnpj(cnpj);

  if (isNumericCnpj(cleaned)) {
    return isValidNumericFormat(cnpj) && !isReservedNumber(cleaned) && isValidChecksum(cleaned);
  }

  if (isAlphanumericCnpj(cleaned)) {
    return isValidFormat(cnpj) && isValidAlphanumericChecksum(cleaned);
  }

  return false;
}
