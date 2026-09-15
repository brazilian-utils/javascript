import { ARRECADACAO_PRODUCT, ARRECADACAO_SEGMENTS } from "../_internals/constants/arrecadacao";
import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";
import { mod10 } from "../_internals/mod10/mod10";
import { mod11 } from "../_internals/mod11/mod11";

/** Options of `generateBoleto`. */
export type GenerateBoletoOptions = {
	/** Which kind of bank slip to generate (default: `"bancario"`). */
	type?: "bancario" | "arrecadacao";
};

const ARRECADACAO_VALUE_IDENTIFIERS = {
	mod10: { effective: "6", reference: "7" },
	mod11: { effective: "8", reference: "9" },
};

const generateBancario = (): string => {
	const p1Base = generateRandomNumber(9);
	const p2Base = generateRandomNumber(10);
	const p3Base = generateRandomNumber(10);
	const lastDigits = generateRandomNumber(15);

	const line =
		p1Base +
		mod10(p1Base).toString() +
		p2Base +
		mod10(p2Base).toString() +
		p3Base +
		mod10(p3Base).toString() +
		lastDigits;

	const boletoWithoutCheck =
		line.slice(0, 4) +
		line.slice(33, 47) +
		line.slice(4, 9) +
		line.slice(10, 20) +
		line.slice(21, 31);

	const mainCheck = mod11(boletoWithoutCheck);

	return line.slice(0, 32) + mainCheck.toString() + line.slice(33);
};

const generateArrecadacao = (): string => {
	const segment = ARRECADACAO_SEGMENTS[Math.floor(Math.random() * ARRECADACAO_SEGMENTS.length)];
	const useMod11 = Math.random() < 0.5;
	const hasEffectiveValue = Math.random() < 0.5;
	const checkDigit = useMod11
		? (value: string): number => mod11(value, { variant: "arrecadacao" })
		: mod10;
	const identifier =
		ARRECADACAO_VALUE_IDENTIFIERS[useMod11 ? "mod11" : "mod10"][
			hasEffectiveValue ? "effective" : "reference"
		];

	const body = generateRandomNumber(40);
	const head = `${ARRECADACAO_PRODUCT}${segment}${identifier}`;
	const barcode = head + checkDigit(head + body) + body;

	let line = "";

	for (let block = 0; block < 4; block++) {
		const value = barcode.slice(block * 11, block * 11 + 11);
		line += value + checkDigit(value);
	}

	return line;
};

/**
 * Generates a valid random Brazilian bank slip (boleto) number.
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 *
 * An arrecadação slip draws its segment from 1 to 7 (segment 9 is the banks' own) and its value
 * identifier from all four values, `6` and `8` for an effective amount and `7` and `9` for a
 * reference quantity, so both `hasEffectiveValue` branches of `getBoletoInfo` are reachable.
 *
 * @param {GenerateBoletoOptions} [options] - Optional options.
 * @param {string} options.type - `"bancario"` (default) or `"arrecadacao"`.
 * @returns {string} A valid 47-digit boleto string without formatting, or a 48-digit one for arrecadação.
 *
 * @example
 * ```typescript
 * generateBoleto(); // "00190000090114971860168524522114675860000102656"
 * generateBoleto({ type: "arrecadacao" }); // "846100000005246100291102005460339004695895061080"
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
export const generateBoleto = (options?: GenerateBoletoOptions): string =>
	options?.type === "arrecadacao" ? generateArrecadacao() : generateBancario();
