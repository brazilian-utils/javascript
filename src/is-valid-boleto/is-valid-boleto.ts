import {
	BOLETO_LENGTH,
	CURRENCY_CODE_INDEX,
	FACTOR_INDEX,
	ISPB_ONLY_PREFIX,
	ISPB_ONLY_ZEROS,
	REAL_CURRENCY_CODE,
} from "../_internals/constants/boleto";
import { mod10 } from "../_internals/mod10/mod10";
import { mod11 } from "../_internals/mod11/mod11";
import { parseArrecadacao } from "../_internals/parse-arrecadacao/parse-arrecadacao";
import { sanitizeToDigits } from "../_internals/sanitize-to-digits/sanitize-to-digits";
import { CHECK_DIGIT_POSITION, CONVERT_POSITIONS, PARTIALS } from "./constants";

const isValidPartials = (digits: string): boolean => {
	for (const { start, end, checkIndex } of PARTIALS) {
		const partial = digits.slice(start, end);
		const expected = mod10(partial);
		if (digits.charCodeAt(checkIndex) - 48 !== expected) return false;
	}
	return true;
};

/**
 * Whether position 4 holds the código de moeda `9` or the slip follows the Situação 2 layout
 * (`ISPB_ONLY_PREFIX`, then `ISPB_ONLY_ZEROS` from the factor on), the only place a `0` is
 * assigned.
 * @param {string} digits - The 47 digits of the linha digitável.
 * @returns {boolean} Whether the código de moeda fits the slip.
 */
const isValidCurrency = (digits: string): boolean =>
	digits[CURRENCY_CODE_INDEX] === REAL_CURRENCY_CODE ||
	(digits.startsWith(ISPB_ONLY_PREFIX) && digits.startsWith(ISPB_ONLY_ZEROS, FACTOR_INDEX));

const parseToBoleto = (digits: string): string => {
	let result = "";
	for (const [start, end] of CONVERT_POSITIONS) {
		result += digits.slice(start, end);
	}
	return result;
};

const isValidCheckDigit = (boleto: string): boolean => {
	const withoutCheckDigit =
		boleto.slice(0, CHECK_DIGIT_POSITION) + boleto.slice(CHECK_DIGIT_POSITION + 1);
	const expected = mod11(withoutCheckDigit);
	return boleto.charCodeAt(CHECK_DIGIT_POSITION) - 48 === expected;
};

/**
 * Validates if a Brazilian bank slip (boleto) number is valid.
 *
 * Supports the 47 digit "cobrança bancária" linha digitável and, additionally, the
 * "arrecadação" (convênio/tributos) bank slip: 48 digit linha digitável or 44 digit
 * barcode, both starting with `8`.
 *
 * The código de moeda in position 4 of the cobrança bancária barcode (and of the linha
 * digitável) must be `9` (real), the only code Carta-Circular BCB nº 2.926/2000 assigns. The one
 * exception is the FEBRABAN Convenção da Cobrança "Situação 2" slip of an institution identified
 * only by its ISPB, which carries bank code `988`, código de moeda `0`, fator de vencimento
 * `0000` and the ISPB, padded with zeros to 10 digits, where the amount would be. Up to 2.4.0
 * any digit in position 4 was accepted.
 *
 * @param {string} value - The bank slip number to validate.
 * @returns {boolean} True if the bank slip number is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidBoleto("00190000090114971860168524522114675860000102656"); // true
 * isValidBoleto("0019000009 01149.718601 68524.522114 6 75860000102656"); // true
 * isValidBoleto("846100000005246100291102005460339004695895061080"); // true (arrecadação)
 * isValidBoleto("00170000010114971860168524522114275860000102656"); // false (código de moeda 7)
 * isValidBoleto("98800000060114971860168524522114100000018236120"); // true (Situação 2: 988, moeda 0, ISPB)
 * ```
 *
 * Carta-Circular BCB nº 2.926/2000 specifies the linha digitável fields, the código de moeda
 * `9` (real) in position 4 of the barcode and the módulo 11 check digit (1 when 11 minus the
 * remainder gives 0, 10 or 11, i.e. when the remainder is 0 or 1) of the 47 digit cobrança
 * bancária slip, including the position of the fator de vencimento field. The FEBRABAN "Layout Padrão de
 * Arrecadação/Recebimento com Utilização do Código de Barras" and the FEBRABAN layout index
 * cover the arrecadação slip.
 *
 * @see Official: https://www.bcb.gov.br/pre/normativos/c_circ/2000/pdf/c_circ_2926_v1_O.pdf
 * Carta-Circular BCB nº 2.926/2000, anexo, layout of the barcode: position 04, "Codigo da moeda
 * (9 - real)"; positions 06 to 09, the fator de vencimento counted from 07/10/1997.
 * @see Official: https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Conven%C3%A7%C3%A3o%20da%20Cobran%C3%A7a%20-%2005_02_2021_f.pdf
 * FEBRABAN Convenção da Cobrança (FB-0061/2021), item 2.3.2: "Situação 1", "Código de Moeda = 9
 * (Real)"; "Situação 2", an institution "detentora apenas do ISPB, que será identificada pelo
 * Número Código 988": position 04 "Zero", positions 06 to 09 "Zeros", positions 10 to 19 "ISPB
 * com zeros a esquerda".
 * @see Official: https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%208%20-%2011_05_2026.pdf
 * FEBRABAN "Layout Padrão de Arrecadação/Recebimento com Utilização do Código de Barras",
 * Versão 08 (file of 11/05/2026), "Vigência: a partir de 01.06.2026".
 * @see Official: https://portal.febraban.org.br/pagina/3425/33/pt-br/layout-febraban
 */
export const isValidBoleto = (value: string): boolean => {
	const digits = sanitizeToDigits(value);

	if (parseArrecadacao(digits)) return true;

	if (digits.length !== BOLETO_LENGTH) return false;

	if (!isValidCurrency(digits)) return false;

	if (!isValidPartials(digits)) return false;

	const boleto = parseToBoleto(digits);

	return isValidCheckDigit(boleto);
};
