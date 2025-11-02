const MAX_RECIPIENT_LENGTH = 64;
const MAX_DOMAIN_LENGTH = 253;
const MAX_EMAIL_LENGTH = MAX_RECIPIENT_LENGTH + 1 + MAX_DOMAIN_LENGTH;

const validEmailRegex = /^([!#$%&'*+\-/=?^_`{|}~]{0,1}([a-zA-Z0-9][!#$%&'*+\-/=?^_`{|}~.]{0,1})+)@(([a-zA-Z0-9][-.]{0,1})+)([.]{1}[a-zA-Z0-9]+)$/;

const stringIsBiggerThan = (len: number, ...strs: string[]): boolean =>
  strs.reduce((length, s) => length + s.length, 0) > len;

/**
 * Validates whether a given value is a well-formed email address according to the module's rules.
 *
 * The validation performs the following checks, in order:
 * 1. The value is a non-empty string.
 * 2. The overall email length does not exceed MAX_EMAIL_LENGTH.
 * 3. The email matches the module's `validEmailRegex`.
 * 4. The recipient (local part) length does not exceed MAX_RECIPIENT_LENGTH.
 * 5. The combined length of the domain and top-level domain does not exceed MAX_DOMAIN_LENGTH.
 *
 * Notes:
 * - This function depends on module-level constants (`MAX_EMAIL_LENGTH`, `MAX_RECIPIENT_LENGTH`,
 *   `MAX_DOMAIN_LENGTH`) and `validEmailRegex` to determine validity.
 * - If any of the checks fail, the function returns `false`.
 *
 * @param email - The value to validate as an email address.
 * @returns `true` if the provided value is a string that satisfies all email validation checks; otherwise `false`.
 *
 * @example
 * ```ts
 * isValid('user@example.com'); // true
 * isValid('');                 // false
 * isValid(null as any);        // false
 * isValid('verylong...@ex.com'); // false if exceeds configured limits
 * ```
 */
export function isValid(email: string): boolean {
  if (!email || typeof email !== 'string') return false;

  if (stringIsBiggerThan(MAX_EMAIL_LENGTH, email)) return false;

  const matchedEmail = validEmailRegex.exec(email);

  if (!matchedEmail) return false;

  const [, recipient, , domain, , topLevelDomain] = matchedEmail;

  if (stringIsBiggerThan(MAX_RECIPIENT_LENGTH, recipient)) return false;
  if (stringIsBiggerThan(MAX_DOMAIN_LENGTH, domain, topLevelDomain)) return false;

  return true;
}
