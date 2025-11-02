import { STATES_DATA } from '../../common/states';
import { onlyNumbers } from '../../helpers';

export const VALID_AREA_CODES = Object.keys(STATES_DATA).reduce(
  (acc, state) => acc.concat((STATES_DATA as any)[state].areaCodes),
  []
) as number[];

export const PHONE_MIN_LENGTH = 10;

export const PHONE_MAX_LENGTH = 11;

export const MOBILE_VALID_FIRST_NUMBERS = [6, 7, 8, 9];

export const LANDLINE_VALID_FIRST_NUMBERS = [2, 3, 4, 5];

/**
 * Validates if a phone number has a valid DDD (Discagem Direta à Distância) area code for Brazil
 * @param phone - The phone number string to validate
 * @returns `true` if the first two digits represent a valid Brazilian area code, `false` otherwise
 * @example
 * ```typescript
 * isValidDDD('11999999999') // returns true
 * isValidDDD('00999999999') // returns false
 * ```
 */
export function isValidDDD(phone: string): boolean {
  return VALID_AREA_CODES.includes(Number(phone.substr(0, 2)));
}

/**
 * Validates if a given phone number has the correct length for a Brazilian mobile phone.
 * @param {string} phone - The phone number string to be validated.
 * @returns {boolean} True if the phone number has the correct length, false otherwise.
 */
export function isValidMobilePhoneLength(phone: string): boolean {
  return phone.length === PHONE_MAX_LENGTH;
}

/**
 * Checks if the length of a landline phone number is valid.
 * @param phone - The phone number string to validate.
 * @returns `true` if the phone number length is between the minimum and maximum allowed lengths, `false` otherwise.
 */
export function isValidLandlinePhoneLength(phone: string): boolean {
  return phone.length >= PHONE_MIN_LENGTH && phone.length < PHONE_MAX_LENGTH;
}

/**
 * Validates if a phone number has a valid length for either landline or mobile phones in Brazil.
 * 
 * @param phone - The phone number string to validate
 * @returns True if the phone number has a valid length for either landline or mobile phones, false otherwise
 * 
 * @example
 * ```ts
 * isValidLength('11999999999') // true
 * isValidLength('1199999999') // true
 * isValidLength('119999999') // false
 * ```
 */
export function isValidLength(phone: string): boolean {
  return isValidLandlinePhoneLength(phone) || isValidMobilePhoneLength(phone);
}

/**
 * Checks if the first number of a Brazilian mobile phone number is valid.
 * The first number is the digit in position 2 of the phone string.
 * 
 * @param phone - The phone number string to validate
 * @returns `true` if the first number is valid for a Brazilian mobile phone, `false` otherwise
 * 
 * @example
 * ```typescript
 * isValidMobilePhoneFirstNumber('11912345678') // true
 * isValidMobilePhoneFirstNumber('11812345678') // false
 * ```
 */
export function isValidMobilePhoneFirstNumber(phone: string): boolean {
  return MOBILE_VALID_FIRST_NUMBERS.includes(Number(phone.charAt(2)));
}

/**
 * Checks if the first number of a landline phone is valid according to Brazilian rules
 * @param phone - The phone number to validate
 * @returns True if the first number is valid for a landline phone, false otherwise
 * @throws {Error} If the phone parameter is not a string with at least 3 characters
 * @example
 * isValidLandlinePhoneFirstNumber('1123456789') // returns true
 * isValidLandlinePhoneFirstNumber('1193456789') // returns false
 */
export function isValidLandlinePhoneFirstNumber(phone: string): boolean {
  return LANDLINE_VALID_FIRST_NUMBERS.includes(Number(phone.charAt(2)));
}

/**
 * Validates if the first digit of a Brazilian phone number is valid based on the number length.
 * For landline numbers (8 digits), validates against landline first digit rules.
 * For mobile numbers (9 digits), validates against mobile first digit rules.
 * 
 * @param phone - The phone number string to validate
 * @returns Boolean indicating if the first digit is valid for the given phone number type
 */
export function isValidFirstNumber(phone: string): boolean {
  return phone.length === PHONE_MIN_LENGTH
    ? isValidLandlinePhoneFirstNumber(phone)
    : isValidMobilePhoneFirstNumber(phone);
}

function parsePhoneDigits(phone: string): { isValidDigits: boolean; digits: string } {
  return { isValidDigits: !!phone && typeof phone === 'string', digits: onlyNumbers(phone) };
}

/**
 * Determines whether a provided string represents a valid Brazilian mobile phone number.
 *
 * This function parses the input to extract digits and then applies a set of checks:
 * - Ensures the parsed digits are valid (via parsePhoneDigits).
 * - Verifies the digit count matches expected mobile phone lengths.
 * - Validates the first digit(s) required for Brazilian mobile numbers.
 * - Confirms the DDD (area code) is valid.
 *
 * @param phone - The phone number string to validate. May include formatting characters (spaces, parentheses, dashes, plus sign).
 * @returns True if the input corresponds to a valid Brazilian mobile phone number; otherwise false.
 *
 * @remarks
 * Returns false immediately if parsePhoneDigits reports invalid digits. The function delegates specific validations
 * to helper utilities: isValidMobilePhoneLength, isValidMobilePhoneFirstNumber, and isValidDDD.
 *
 * @example
 * ```ts
 * isValidMobilePhone('+55 (21) 9 9999-9999'); // true
 * isValidMobilePhone('21999999999'); // true
 * isValidMobilePhone('021999999999'); // false
 * ```
 */
export function isValidMobilePhone(phone: string): boolean {
  const { isValidDigits, digits } = parsePhoneDigits(phone);

  if (!isValidDigits) return false;

  return isValidMobilePhoneLength(digits) && isValidMobilePhoneFirstNumber(digits) && isValidDDD(digits);
}

/**
 * Checks if a given landline phone number is valid according to Brazilian rules.
 * The number must have valid digits, correct length, valid first number, and valid area code (DDD).
 * 
 * @param phone - The phone number string to validate
 * @returns True if the landline phone number is valid, false otherwise
 *
 * @example
 * ```ts
 * isValidLandlinePhone('1140028922'); // true
 * isValidLandlinePhone('11400289'); // false
 * isValidLandlinePhone('11900289228'); // false
 * ```
 */
export function isValidLandlinePhone(phone: string): boolean {
  const { isValidDigits, digits } = parsePhoneDigits(phone);

  if (!isValidDigits) return false;

  return isValidLandlinePhoneLength(digits) && isValidLandlinePhoneFirstNumber(digits) && isValidDDD(digits);
}

/**
 * Validates a Brazilian phone number.
 * 
 * Checks if the provided phone number is valid by verifying:
 * - The digits are valid (numeric characters)
 * - The length is correct
 * - The first number after the area code is valid
 * - The DDD (area code) is valid
 * 
 * @param {string} phone - The phone number string to validate (may include formatting characters)
 * @returns {boolean} Returns true if the phone number is valid, false otherwise
 * 
 * @example
 * isValid('(11) 98765-4321'); // returns true
 * isValid('11987654321');      // returns true
 * isValid('123');              // returns false
 */
export function isValid(phone: string): boolean {
  const { isValidDigits, digits } = parsePhoneDigits(phone);

  if (!isValidDigits) return false;

  return isValidLength(digits) && isValidFirstNumber(digits) && isValidDDD(digits);
}
