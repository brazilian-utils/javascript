import { hasOnlyPhoneCharacters } from "../_internals/has-only-phone-characters/has-only-phone-characters";
import { isServicePhoneDigits } from "../_internals/is-service-phone-digits/is-service-phone-digits";
import { resolveServicePhoneDigits } from "../_internals/resolve-service-phone-digits/resolve-service-phone-digits";

/**
 * Validates if a phone number is a valid Brazilian service number.
 *
 * Service numbers are dialed without a DDD, so they are validated by prefix and length alone:
 * - the Códigos Não Geográficos `0300`, `0303`, `0500`, `0800` and `0900`, each followed by
 *   7 digits (11 in total, the shorter, extinct `0800` + 6 form is rejected): the 10 digit CNG
 *   series of Resolução Anatel nº 749/2022 art. 18, dialed behind the Prefixo Nacional `0` (art.
 *   28);
 * - the abbreviated `300X` and `400X` numbers, followed by 4 digits, e.g. `3003-1234`. Anatel
 *   withdrew the 4-digit codes rather than allocating them (Resolução nº 86/1998 art. 43 I and
 *   Ato nº 43.151/2004 art. 2º II both ordered them released), so the accepted roots are the
 *   conventional ones the market settled on. Only `300X` and `400X` are recognised: other
 *   "Número Único" carrier prefixes in market use, such as `4020` and `4062`, are out of scope
 *   and are rejected;
 * - the 3-digit Códigos de Acesso a Serviços de Utilidade Pública that Anatel has designated,
 *   e.g. `190` and `192`, as listed on Anatel's gov.br SUP page (modified on 22/06/2023) and in
 *   the Anexo of Ato nº 43.151/2004, the last consolidated act. Undesignated codes in the `1XX`
 *   range are rejected. The page lists `112/911` for the Polícia Militar on handsets: `112` is
 *   accepted, while `911` stays rejected, since it is not inside the `1N₂N₁` range Resolução nº
 *   749/2022 art. 13 destines to public utility services (every other series is reserva
 *   técnica), a conflict between the two official texts that keeps the 2.4.0 answer.
 *
 * A Brazilian country code is accepted and removed first, under the rule documented in
 * `parsePhone`, the same as `isValidPhone` does with `accept: ["service"]`: `+55`, `0055` or a
 * bare `55` before a number of 10 or 11 digits. Up to 2.4.0 this function rejected it, so
 * `"+55 0800 123 4567"` and `"+55 190"` were `false`.
 *
 * Any character other than digits, whitespace and `()+.-/` (a letter, for instance) makes the
 * value invalid; up to 2.4.0 such characters were dropped.
 *
 * Only the structure is checked: the number does not have to be assigned to anyone, and the
 * `0500` rule that encodes a donation amount in the last two digits is not enforced.
 *
 * @param {string} value - The phone number to validate.
 * @returns {boolean} True if the phone number is a valid service phone, false otherwise.
 *
 * @example
 * ```typescript
 * isValidServicePhone("0800 123 4567"); // true
 * isValidServicePhone("4004-1234"); // true
 * isValidServicePhone("190"); // true
 * isValidServicePhone("+55 0800 123 4567"); // true
 * isValidServicePhone("11987654321"); // false (geographic number)
 * ```
 *
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 * Resolução Anatel nº 749/2022, arts. 13, 14, 18 and 28.
 * @see Official: https://www.gov.br/anatel/pt-br/regulado/numeracao/codigos-nacionais/servicos-de-utilidade-publica-e-de-emergencia
 * Anatel, "Serviços de Utilidade Pública e de Emergência (SUP)", modified on 22/06/2023, the
 * current list of the 3-digit public utility codes.
 * @see Official: https://informacoes.anatel.gov.br/legislacao/atos-de-numeracao/2004/1648-ato-43151
 * Ato Anatel nº 43.151/2004, whose Anexo designates the 3-digit public utility codes.
 */
export const isValidServicePhone = (value: string): boolean => {
	if (typeof value !== "string" || !hasOnlyPhoneCharacters(value)) return false;

	return isServicePhoneDigits(resolveServicePhoneDigits(value));
};
