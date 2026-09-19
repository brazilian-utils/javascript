import { SUFRAMA_LENGTH } from "../_internals/constants/suframa";
import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";
import { mod11 } from "../_internals/mod11/mod11";

/**
 * Generates a random Inscrição SUFRAMA with a valid check digit, for tests and fixtures.
 *
 * The sector code is never `00`, the only structural rule the NF-e manual states. The manual lists
 * sector and locality codes only as examples, so the generated ones are random and need not match
 * a code SUFRAMA uses.
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 *
 * @returns {string} A valid 9-digit Inscrição SUFRAMA string without formatting.
 *
 * @example
 * ```typescript
 * generateSuframa(); // "123456789"
 * ```
 *
 * @see Official: https://portal.fazenda.sp.gov.br/servicos/nfce/Downloads/Manual_de_Orientacao_Contribuinte_v_6.pdf
 * Manual de Orientação do Contribuinte da NF-e 6.0, Anexo XII.01 (composition, validation and
 * check digit example).
 */
export const generateSuframa = (): string => {
	let base = generateRandomNumber(SUFRAMA_LENGTH - 1);

	while (base.startsWith("00")) {
		base = generateRandomNumber(SUFRAMA_LENGTH - 1);
	}

	return `${base}${mod11(base, { variant: "arrecadacao" })}`;
};
