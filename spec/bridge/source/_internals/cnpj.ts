/**
 * What the CNPJ utilities share: the shapes a CNPJ can be written in, and its check digits.
 *
 * Every name here is spliced into the utility that imports it and emitted as one of its own
 * private declarations, so this file is where a CNPJ rule is written once — not a module any
 * target ends up depending on.
 *
 * @see Official: https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf
 */

/** The weights of the first check digit, most significant first. */
export const FIRST_DIGIT_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** The weights of the second check digit, most significant first. */
export const SECOND_DIGIT_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** A version 2 CNPJ: letters allowed everywhere but the two check digits. */
export const ALPHANUMERIC_FORMAT =
	/^[0-9A-Z]{2}[\s.\-/]*[0-9A-Z]{3}[\s.\-/]*[0-9A-Z]{3}[\s.\-/]*[0-9A-Z]{4}[\s.\-/]*[0-9]{2}$/;

/** A version 1 CNPJ: digits only, with the usual mask characters between the groups. */
export const NUMERIC_FORMAT = /^\d{2}[\s.\-/]*\d{3}[\s.\-/]*\d{3}[\s.\-/]*\d{4}[\s.\-/]*\d{2}$/;

/** Whether a value holds a letter, which is what tells the two versions apart. */
export const LETTER = /[A-Z]/;

/** Everything a version 2 CNPJ is not made of. */
export const NON_ALPHANUMERIC = /[^A-Za-z0-9]/g;

/** Everything a version 1 CNPJ is not made of. */
export const NON_DIGIT = /\D/g;

/**
 * Computes one CNPJ check digit from the base and its weight vector.
 *
 * @param {string} base - The sanitized CNPJ, of which only the base is read.
 * @param {number[]} weights - The weight vector of the digit being computed.
 * @returns {number} The check digit.
 */
export const checkDigit = (base: string, weights: number[]): number => {
	let sum = 0;

	for (let index = 0; index < weights.length; index++) {
		sum += (base.charCodeAt(index) - 48) * weights[index];
	}

	const remainder = sum % 11;

	if (remainder < 2) {
		return 0;
	}

	return 11 - remainder;
};

/**
 * Whether both check digits of a sanitized 14 character CNPJ match its base.
 *
 * @param {string} cnpj - The sanitized CNPJ.
 * @returns {boolean} True when both check digits match.
 */
export const hasValidChecksum = (cnpj: string): boolean => {
	if (cnpj.charCodeAt(12) - 48 !== checkDigit(cnpj, FIRST_DIGIT_WEIGHTS)) {
		return false;
	}

	return cnpj.charCodeAt(13) - 48 === checkDigit(cnpj, SECOND_DIGIT_WEIGHTS);
};

/**
 * Whether every character of the value is the same one.
 *
 * @param {string} value - The value.
 * @returns {boolean} True when the value repeats one character.
 */
export const isRepeated = (value: string): boolean => {
	if (value.length === 0) {
		return false;
	}

	for (let index = 1; index < value.length; index++) {
		if (value.charCodeAt(index) !== value.charCodeAt(0)) {
			return false;
		}
	}

	return true;
};
