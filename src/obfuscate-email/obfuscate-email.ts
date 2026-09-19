import { isValidEmail } from "../is-valid-email/is-valid-email";
import { VISIBLE_LENGTH } from "./constants";

const hideAfter = (text: string, visible: number): string =>
	`${text.slice(0, visible)}${"*".repeat(text.length - visible)}`;

/**
 * Hides most of an e-mail address with `*`, for the places where an address is shown to someone
 * who should only recognize it (LGPD, art. 6º III, necessidade).
 *
 * It follows the way the gov.br account shows the registered address, `"li***********@gm*******"`:
 * the first 2 characters of the local part and the first 2 of the domain stay, the `@` stays,
 * and every other character, the dots of the domain included, becomes one `*`, so the length of
 * the address is preserved. The gov.br sample does not cover a local part of 1 or 2 characters,
 * which that rule would show whole; here such a local part always loses its last character
 * (`"ab@example.com"` becomes `"a*@ex*********"`, `"a@example.com"` becomes `"*@ex*********"`).
 *
 * The value is judged by `isValidEmail` as it comes, with no trimming, and keeps its letter case.
 *
 * @param {string} value - The e-mail address to obfuscate.
 * @returns {string} The obfuscated address, or an empty string when the value is not a valid
 * e-mail address.
 *
 * @example
 * ```typescript
 * obfuscateEmail("fulano.silva@example.com"); // "fu**********@ex*********"
 * obfuscateEmail("ab@example.com.br"); // "a*@ex************"
 * obfuscateEmail("not an e-mail"); // ""
 * ```
 *
 * @see Official: https://acesso.gov.br/faq/_perguntasdafaq/formarrecuperarconta.html
 * The gov.br account FAQ, whose "Recuperar senha com e-mail" screen shows the registered address
 * as `"li***********@gm*******"`.
 * @see Official: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
 * Lei nº 13.709/2018 (LGPD), art. 6º III: processing limited to the minimum the purpose needs.
 */
export const obfuscateEmail = (value: string): string => {
	if (!isValidEmail(value)) return "";

	const separatorIndex = value.indexOf("@");
	const local = value.slice(0, separatorIndex);
	const domain = value.slice(separatorIndex + 1);
	const visibleLocal = Math.min(VISIBLE_LENGTH, local.length - 1);

	return `${hideAfter(local, visibleLocal)}@${hideAfter(domain, VISIBLE_LENGTH)}`;
};
