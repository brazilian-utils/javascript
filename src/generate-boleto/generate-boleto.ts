import { assembleBoletoArrecadacao } from "../_internals/assemble-boleto-arrecadacao/assemble-boleto-arrecadacao";
import { assembleBoletoBancario } from "../_internals/assemble-boleto-bancario/assemble-boleto-bancario";
import { ARRECADACAO_SEGMENTS } from "../_internals/constants/arrecadacao";
import { REAL_CURRENCY_CODE } from "../_internals/constants/boleto";
import { generateRandomNumber } from "../_internals/generate-random-number/generate-random-number";
import { MAX_DUE_DATE_FACTOR, MIN_DUE_DATE_FACTOR, NO_DUE_DATE_FACTOR } from "./constants";

/** The parameters of `generateBoleto`. */
export type GenerateBoletoParams = {
	/** Which kind of bank slip to generate (default: `"bancario"`). */
	type?: "bancario" | "arrecadacao";
};

/**
 * Draws a fator de vencimento that denotes a due date, or none: `0000` (no due date) or one of
 * `1000` to `9999`, each of the 9001 values equally likely. A factor from `0001` to `0999` maps
 * to no date: the factor reached 1000 on 03/07/2000, and since the 22/02/2025 reset the cycle
 * restarts at 1000 rather than at 0001, which is why `getBoletoInfo` reads those as `null`.
 *
 * @returns {string} The 4 digit factor.
 */
const drawDueDateFactor = (): string => {
	const draw = Math.floor(Math.random() * (MAX_DUE_DATE_FACTOR - MIN_DUE_DATE_FACTOR + 2));

	return draw === 0 ? NO_DUE_DATE_FACTOR : String(MIN_DUE_DATE_FACTOR - 1 + draw);
};

const generateBancario = (): string =>
	assembleBoletoBancario({
		field1: generateRandomNumber(3) + REAL_CURRENCY_CODE + generateRandomNumber(5),
		field2: generateRandomNumber(10),
		field3: generateRandomNumber(10),
		// The first digit is the slot of the DV geral, which assembleBoletoBancario overwrites.
		tail: `0${drawDueDateFactor()}${generateRandomNumber(10)}`,
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
 * A cobrança bancária slip carries the código de moeda `9` (real) in position 4, the only one
 * Carta-Circular BCB nº 2.926/2000 assigns, after a random 3 digit bank code, and a fator de
 * vencimento of `0000` (no due date) or `1000` to `9999`, the values that denote a date:
 * `0001` to `0999` denote none, the factor having reached 1000 on 03/07/2000 and restarted at
 * 1000 on 22/02/2025.
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
 * Carta-Circular BCB nº 2.926/2000 specifies the linha digitável fields, the código de moeda
 * `9` (real) in position 4 of the barcode and the módulo 11 check digit (1 when 11 minus the
 * remainder gives 0, 10 or 11, i.e. when the remainder is 0 or 1) of the 47 digit cobrança
 * bancária slip, including the position of the fator de vencimento field. The FEBRABAN "Layout Padrão de
 * Arrecadação/Recebimento com Utilização do Código de Barras" and the FEBRABAN layout index
 * cover the arrecadação slip.
 *
 * @see Official: https://www.bcb.gov.br/pre/normativos/c_circ/2000/pdf/c_circ_2926_v1_O.pdf
 * Carta-Circular BCB nº 2.926/2000, anexo, layout of the barcode: position 04, "código da
 * moeda", 9 (real); positions 06 to 09, the fator de vencimento counted from 07/10/1997.
 * @see Official: https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%208%20-%2011_05_2026.pdf
 * FEBRABAN "Layout Padrão de Arrecadação/Recebimento com Utilização do Código de Barras",
 * Versão 08 (file of 11/05/2026), "Vigência: a partir de 01.06.2026".
 * @see Official: https://portal.febraban.org.br/pagina/3425/33/pt-br/layout-febraban
 */
export const generateBoleto = (params?: GenerateBoletoParams): string =>
	params?.type === "arrecadacao" ? generateArrecadacao() : generateBancario();
