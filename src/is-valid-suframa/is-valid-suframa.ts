import { SUFRAMA_LENGTH } from "../_internals/constants/suframa";
import { mod11 } from "../_internals/mod11/mod11";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";

/**
 * Validates an Inscrição SUFRAMA, the registration number the Superintendência da Zona Franca de
 * Manaus gives to companies with tax incentives, carried by the `ISUF` field of the NF-e.
 * Accepts the usual mask characters (`.`, `-`, `/`, `(`, `)`, `,`, `*`) and whitespace.
 *
 * The number is `SS.NNNN.LLD`: sector of activity, sequential number, locality of the SUFRAMA
 * unit that registered the company and check digit. The NF-e field is numeric with 8 or 9
 * positions, because a sector code such as `01` loses its leading zero, so an 8 digit value is
 * read with that zero back in place. The sector code can never be `00`. The check digit is módulo
 * 11 with weights 2 to 9 from right to left, and is 0 when the remainder is 0 or 1.
 *
 * The manual lists sector and locality codes only as examples, so they are not checked against a
 * table.
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
 * @see Official: https://portal.fazenda.sp.gov.br/servicos/nfce/Downloads/Manual_de_Orientacao_Contribuinte_v_6.pdf
 * Manual de Orientação do Contribuinte da NF-e 6.0, Anexo XII.01 (composition, validation and
 * check digit example) and validation rule E18-20 (rejection 235).
 */
export const isValidSuframa = (suframa: string): boolean => {
	if (typeof suframa !== "string") return false;

	const hasInvalidChars = /[^0-9\s().,*/-]/.test(suframa);

	if (hasInvalidChars) return false;

	const digits = sanitizeToDigits(suframa);

	if (digits.length !== SUFRAMA_LENGTH && digits.length !== SUFRAMA_LENGTH - 1) return false;

	const full = digits.padStart(SUFRAMA_LENGTH, "0");

	if (full.startsWith("00")) return false;

	const checkDigit = mod11(full.slice(0, -1), { variant: "arrecadacao" });

	return full.charCodeAt(SUFRAMA_LENGTH - 1) - 48 === checkDigit;
};
