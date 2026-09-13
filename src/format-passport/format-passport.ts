import { parsePassport } from "../parse-passport/parse-passport";

/**
 * Formats a Brazilian passport number for display.
 * Converts to uppercase and removes all non-alphanumeric characters.
 *
 * @param {string} passport - A Brazilian passport number (any case, possibly with symbols).
 * @returns {string} The uppercased, symbol-free value capped to 8 characters, or an empty
 * string for a non-string input (a number is never a passport number: the series is two letters).
 *
 * @example
 * formatPassport("ab123456") // "AB123456"
 * formatPassport("AB-123.456") // "AB123456"
 * formatPassport("") // ""
 *
 * @see Official: https://www.gov.br/pf/pt-br/assuntos/passaporte
 * @see Official: https://www.gov.br/pf/pt-br/assuntos/passaporte/ajuda/duvidas_/caderneta/caderneta-numero-onde-fica-e
 */
export const formatPassport = (passport: string): string => parsePassport(passport);
