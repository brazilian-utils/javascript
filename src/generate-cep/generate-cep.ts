import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";

/**
 * Generates a random Brazilian CEP (postal code).
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 * A CEP has no check digit, so every 8 digit string is structurally valid.
 *
 * @returns {string} A random 8 digit CEP without formatting.
 *
 * @example
 * ```typescript
 * generateCep(); // "01310930"
 * ```
 *
 * @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/tudo-sobre-cep
 * @see Official: https://www.correios.com.br/enviar/precisa-de-ajuda/guia-de-enderecamento/guia-de-enderecamento
 */
export const generateCep = (): string => generateRandomNumber(8);
