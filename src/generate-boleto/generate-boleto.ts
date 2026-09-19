import { assembleBoletoArrecadacao } from "../_internals/assemble-boleto-arrecadacao/assemble-boleto-arrecadacao";
import { assembleBoletoBancario } from "../_internals/assemble-boleto-bancario/assemble-boleto-bancario";
import { ARRECADACAO_SEGMENTS } from "../_internals/constants/arrecadacao";
import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";

/** The parameters of `generateBoleto`. */
export type GenerateBoletoParams = {
	/** Which kind of bank slip to generate (default: `"bancario"`). */
	type?: "bancario" | "arrecadacao";
};

const generateBancario = (): string =>
	assembleBoletoBancario({
		field1: generateRandomNumber(9),
		field2: generateRandomNumber(10),
		field3: generateRandomNumber(10),
		tail: generateRandomNumber(15),
	});

const generateArrecadacao = (): string =>
	assembleBoletoArrecadacao({
		segment: ARRECADACAO_SEGMENTS[Math.floor(Math.random() * ARRECADACAO_SEGMENTS.length)],
		useMod11: Math.random() < 0.5,
		hasEffectiveValue: Math.random() < 0.5,
		body: generateRandomNumber(40),
	});

/**
 * Generates a valid random Brazilian bank slip (boleto) number.
 *
 * Uses `Math.random()` internally, so it is not cryptographically secure, do not use for security purposes.
 *
 * An arrecadação slip draws its segment from 1 to 7 (segment 9 is the banks' own) and its value
 * identifier from all four values, `6` and `8` for an effective amount and `7` and `9` for a
 * reference quantity, so both `hasEffectiveValue` branches of `getBoletoInfo` are reachable.
 *
 * @param {GenerateBoletoParams} [params] - Optional parameters.
 * @param {string} params.type - `"bancario"` (default) or `"arrecadacao"`.
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
export const generateBoleto = (params?: GenerateBoletoParams): string =>
	params?.type === "arrecadacao" ? generateArrecadacao() : generateBancario();
