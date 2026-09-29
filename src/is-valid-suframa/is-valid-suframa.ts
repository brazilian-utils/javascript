import { SUFRAMA_FORMAT_REGEX, SUFRAMA_LENGTH } from "../_internals/constants/suframa";
import { mod11 } from "../_internals/mod11/mod11";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Validates an Inscrição SUFRAMA, the registration number the Superintendência da Zona Franca de
 * Manaus gives to companies with tax incentives, carried by the `ISUF` field of the NF-e.
 * Accepts the mask characters `isValidCpf` reads (whitespace, `.`, `-` and `/`, alone or in a run)
 * between the fields of `SS.NNNN.LLD` (the check digit included, as in `20.5678.10-6`), and
 * surrounding whitespace. Any other character, or a separator inside a field, makes the value
 * invalid.
 *
 * The number is `SS.NNNN.LLD`: sector of activity, sequential number, locality of the SUFRAMA
 * unit that registered the company and check digit. The NF-e field is numeric with 8 or 9
 * positions and the MOC only says "SS pode começar por '0'"; reading an 8 digit value as one whose
 * sector code lost its leading zero, and putting that zero back, is this library's inference. The sector code can never be `00`. The check digit is módulo
 * 11 with weights 2 to 9 from right to left, and is 0 when the remainder is 0 or 1.
 *
 * The manual lists sector and locality codes only as examples, so they are not checked against a
 * table.
 *
 * The rule is published by the NF-e Manual de Orientação do Contribuinte (CONFAZ/ENCAT), not by
 * the SUFRAMA: its Resolução CAS nº 64/2021, art. 5º, only says the inscrição is "um número de
 * identificação e controle gerado por ocasião do cadastramento", permanent and never reused, and
 * neither its cadastro FAQ nor the CADSUF manual gives a layout or a check digit.
 *
 * @param {string} suframa - The Inscrição SUFRAMA to validate.
 * @returns {boolean} True if the Inscrição SUFRAMA is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidSuframa("123456789"); // true
 * isValidSuframa("12.3456.789"); // true
 * isValidSuframa("10001018"); // true (same as "010001018")
 * isValidSuframa("123456780"); // false (wrong check digit)
 * isValidSuframa("001234560"); // false (sector 00)
 * ```
 *
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-visao-geral.pdf
 * Manual de Orientação do Contribuinte (MOC) NF-e 7.0, Visão Geral, section 8.4: the composition
 * `SS.NNNN.LLD`, the numeric field with 8 or 9 positions whose `SS` may start with 0 but never be
 * `00`, and the módulo 11 check digit with weights 2 to 9 and 0 for a remainder of 0 or 1.
 * @see Official: https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf
 * MOC 7.0, Anexo I: field 79 (`E18`, `ISUF`) is numeric with 8 to 9 positions, and validation
 * rule E18-20 turns down an Inscrição SUFRAMA with an invalid check digit (rejection 235).
 */
export const isValidSuframa = (suframa: string): boolean => {
	if (typeof suframa !== "string") return false;

	const trimmed = suframa.trim();

	if (!SUFRAMA_FORMAT_REGEX.test(trimmed)) return false;

	const full = sanitizeToDigits(trimmed).padStart(SUFRAMA_LENGTH, "0");

	if (full.startsWith("00")) return false;

	const checkDigit = mod11(full.slice(0, -1), { variant: "arrecadacao" });

	return full.charCodeAt(SUFRAMA_LENGTH - 1) - 48 === checkDigit;
};
