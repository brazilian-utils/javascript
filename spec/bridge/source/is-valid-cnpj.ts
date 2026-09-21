/**
 * `isValidCnpj`, written once.
 *
 * This is ordinary TypeScript inside the portable subset the bridge accepts: annotated
 * parameters and returns, regex literals it compiles rather than passes through, and the same
 * boundary guards the handwritten package has. `spec/bridge/README.md` documents the subset;
 * the compiler rejects anything outside it instead of guessing.
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cnpj
 * @see Official: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico
 */
import {
	ALPHANUMERIC_FORMAT,
	LETTER,
	NON_ALPHANUMERIC,
	NON_DIGIT,
	NUMERIC_FORMAT,
	hasValidChecksum,
	isRepeated,
} from "./_internals/cnpj.ts";

/** Options of `isValidCnpj`. */
export type IsValidCnpjOptions = {
	/** Which CNPJ format to accept: `1` numeric only, `2` alphanumeric (default: `1`). */
	version?: 1 | 2;
};

/**
 * Validates if a CNPJ (Cadastro Nacional da Pessoa Jurídica) is valid.
 *
 * Supports both numeric (version 1) and alphanumeric (version 2) CNPJ formats, and accepts the
 * usual mask characters (`.`, `-`, `/`) and whitespace around and between groups.
 *
 * @param {string} cnpj - The CNPJ value to be validated.
 * @param {IsValidCnpjOptions} [options] - Optional options.
 * @returns {boolean} True if the CNPJ is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidCnpj("12.345.678/0001-95"); // true
 * isValidCnpj("q0slfmbd7vx439", { version: 2 }); // true
 * isValidCnpj("00000000000000"); // false (reserved number)
 * ```
 */
export const isValidCnpj = (cnpj: string, options?: IsValidCnpjOptions): boolean => {
	if (typeof cnpj !== "string") {
		return false;
	}

	const trimmed = cnpj.trim();

	if (options?.version === 2) {
		const cleaned = cnpj.replaceAll(NON_ALPHANUMERIC, "").toUpperCase();

		if (LETTER.test(cleaned)) {
			if (!ALPHANUMERIC_FORMAT.test(trimmed.toUpperCase())) {
				return false;
			}

			return hasValidChecksum(cleaned);
		}
	}

	const numeric = cnpj.replaceAll(NON_DIGIT, "");

	if (!NUMERIC_FORMAT.test(trimmed)) {
		return false;
	}

	if (isRepeated(numeric)) {
		return false;
	}

	return hasValidChecksum(numeric);
};
