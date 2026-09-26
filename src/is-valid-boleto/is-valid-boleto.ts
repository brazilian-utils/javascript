import { BOLETO_LENGTH } from "../_internals/constants/boleto";
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
 * One leniency is kept from 2.3.0: the código de moeda in position 4 of the cobrança bancária
 * barcode is not checked, although Carta-Circular BCB nº 2.926/2000 fixes it at `9` (real), so
 * a slip carrying any other moeda digit still validates.
 *
 * @param {string} value - The bank slip number to validate.
 * @returns {boolean} True if the bank slip number is valid, false otherwise.
 *
 * @example
 * ```typescript
 * isValidBoleto("00190000090114971860168524522114675860000102656"); // true
 * isValidBoleto("0019000009 01149.718601 68524.522114 6 75860000102656"); // true
 * isValidBoleto("846100000005246100291102005460339004695895061080"); // true (arrecadação)
 * ```
 *
 * Carta-Circular BCB nº 2.926/2000 specifies the linha digitável fields and the módulo 11
 * check digit (using 1 for remainders 0, 10 and 1) of the 47 digit cobrança bancária slip,
 * including the position of the fator de vencimento field. The FEBRABAN "Layout Padrão de
 * Arrecadação/Recebimento com Utilização do Código de Barras" and the FEBRABAN layout index
 * cover the arrecadação slip.
 *
 * @see Official: https://www.bcb.gov.br/pre/normativos/c_circ/2000/pdf/c_circ_2926_v1_O.pdf
 * @see Official: https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%208%20-%2011_05_2026.pdf
 * @see Official: https://portal.febraban.org.br/pagina/3425/33/pt-br/layout-febraban
 */
export const isValidBoleto = (value: string): boolean => {
	const digits = sanitizeToDigits(value);

	if (parseArrecadacao(digits)) return true;

	if (digits.length !== BOLETO_LENGTH) return false;

	if (!isValidPartials(digits)) return false;

	const boleto = parseToBoleto(digits);

	return isValidCheckDigit(boleto);
};
