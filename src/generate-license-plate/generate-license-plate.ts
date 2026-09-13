import { type LicensePlateFormat } from "../get-format-license-plate/get-format-license-plate";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const DEFAULT_FORMAT = "LLLNLNN";

/** The license plate formats `generateLicensePlate` can generate. */
export type GenerateLicensePlateFormat = LicensePlateFormat;

const randomLetter = (): string => LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));

const randomDigit = (): string => Math.floor(Math.random() * 10).toString();

/**
 * Generates a valid random Brazilian license plate (placa de carro ou moto).
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for
 * security purposes.
 *
 * @param {GenerateLicensePlateFormat} [format] - The format to generate. Defaults to the
 * Mercosul format ("LLLNLNN"), the single sequence Resolução CONTRAN nº 969/2022 defines for
 * every vehicle, motorcycles included.
 * @returns {string} A randomly generated license plate matching the requested format.
 *
 * @example
 * ```typescript
 * generateLicensePlate(); // "ABC1D23" (Mercosul)
 * generateLicensePlate("LLLNNNN"); // "ABC1234" (old Brazilian format)
 * ```
 *
 * The resolution's own text does not spell the sequence out: art. 2º § 2º delegates the
 * technical specification to Anexo I, whose item 1.2 reads "O padrão de estampagem é composto de
 * 7 (sete) caracteres alfanuméricos, em alto relevo, na sequência LLLNLNN" and whose item 1.2.1
 * reads `L` as a letter and `N` as a numeral. The annexes are published in a PDF of their own,
 * cited below alongside the resolution's text.
 *
 * A `format` string outside the two supported literals is not rejected: it is used verbatim,
 * character by character, `L` producing a letter and every other position a digit, which is the
 * 2.3.0 behaviour and is kept for the JavaScript callers the type cannot reach. So
 * `generateLicensePlate("LLLNNLN")` returns a plate in the withdrawn motorcycle sequence, which
 * `isValidLicensePlate` rejects, `generateLicensePlate("bogus")` returns five digits and
 * `generateLicensePlate("")` returns an empty string. Only a non-string falls back to the
 * default. Pass one of the two literals to get a plate the library considers valid.
 *
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022.pdf
 * @see Official: https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-contran/resolucoes/resolucao9692022anexos.pdf
 */
export const generateLicensePlate = (
	format: GenerateLicensePlateFormat = DEFAULT_FORMAT,
): string => {
	const safeFormat = typeof format === "string" ? format : DEFAULT_FORMAT;

	let plate = "";

	for (let i = 0; i < safeFormat.length; i++) {
		plate += safeFormat.charAt(i) === "L" ? randomLetter() : randomDigit();
	}

	return plate;
};
