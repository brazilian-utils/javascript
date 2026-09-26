/**
 * Número Único de Processo (`NNNNNNN-DD.AAAA.J.TR.OOOO`) of Resolução CNJ nº 65/2008: the length
 * of the digits only value and the closed list of tribunal codes (TR) each órgão code (J) accepts.
 *
 * `J` comes from art. 1º, § 4º, which names one segment per digit: Supremo Tribunal Federal `1`,
 * Conselho Nacional de Justiça `2`, Superior Tribunal de Justiça `3`, Justiça Federal `4`,
 * Justiça do Trabalho `5`, Justiça Eleitoral `6`, Justiça Militar da União `7`, Justiça dos
 * Estados e do Distrito Federal e Territórios `8` and Justiça Militar Estadual `9`.
 *
 * `TR` comes from art. 1º, § 5º, whose incisos close the list segment by segment: `00` for the
 * processes originating in the STF, the CNJ, the STJ, the TST, the TSE and the STM (inciso I);
 * `90` for those originating in the Conselho da Justiça Federal and in the Conselho Superior da
 * Justiça do Trabalho (inciso II); `01` to `06` for the Tribunais Regionais Federais (inciso III,
 * in the wording Resolução CNJ nº 477/2022 gave it to seat the TRF da 6ª Região created by Lei nº
 * 14.226/2021); `01` to `24` for the Tribunais Regionais do Trabalho (inciso IV); `01` to `27`
 * for the Tribunais Regionais Eleitorais (inciso V); `01` to `12` for the Circunscrições
 * Judiciárias Militares (inciso VI); `01` to `27` for the Tribunais de Justiça (inciso VII); and
 * `13`, `21` and `26` for the Tribunais de Justiça Militar of Minas Gerais, Rio Grande do Sul and
 * São Paulo (inciso VIII).
 *
 * The unidade de origem (`OOOO`) is left out on purpose: art. 1º, § 6º hands its codification to
 * each tribunal, which only has to publish its own list on its website, so there is no central
 * roll to check a code against.
 *
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/119
 * Resolução CNJ nº 65, de 16 de dezembro de 2008, whose art. 1º, § 4º and § 5º carry the two
 * lists above and whose Anexos I to VII print one example number per tribunal.
 * @see Official: https://atos.cnj.jus.br/atos/detalhar/4781
 * Resolução CNJ nº 477, de 10 de outubro de 2022, art. 1º: "nos processos da Justiça Federal, os
 * Tribunais Regionais Federais devem ser identificados no campo (TR) pelos números de 01 a 06,
 * observadas as respectivas regiões". Its Anexo II prints `0000100-15.2008.406.0000` for the TRF
 * da 6ª Região.
 * @see Official: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14226.htm
 * Lei nº 14.226, de 20 de outubro de 2021, art. 1º: "É criado o Tribunal Regional Federal da 6ª
 * Região, com sede em Belo Horizonte e jurisdição no Estado de Minas Gerais", the court Resolução
 * CNJ nº 477/2022 added to the TR range of the Justiça Federal.
 */

/** Digits of a processo jurídico number (`NNNNNNNDDAAAAJTROOOO`, Resolução CNJ nº 65/2008). */
export const PROCESSO_JURIDICO_LENGTH = 20;

/** Modulus of the ISO 7064 MOD 97-10 check the two verifying digits (`DD`) come from. */
export const MOD_97_10_QUOTIENT = 97;

/** The MOD 97-10 check digits are this value minus the remainder of the number times 100 by 97. */
export const MOD_97_10_SUM = 98;

/**
 * @param {number} first Lowest code of the range.
 * @param {number} last Highest code of the range.
 * @returns {number[]} Every code from `first` to `last`, both included.
 */
const range = (first: number, last: number): number[] =>
	Array.from({ length: last - first + 1 }, (_, index) => first + index);

/** Superior court of a segment, which files its own processes under a zeroed `TR` (§ 5º, I). */
const SUPERIOR_COURT = 0;

/** Conselho da Justiça Federal and Conselho Superior da Justiça do Trabalho (§ 5º, II). */
const COUNCIL = 90;

let tribunals: ReadonlyMap<number, readonly number[]> | undefined;

/**
 * Tribunal codes (`TR`) Resolução CNJ nº 65/2008 allows under each órgão code (`J`). Built on the
 * first call and kept, instead of at module level, so a bundle that never reads it drops it,
 * ranges and all.
 *
 * @returns {ReadonlyMap<number, readonly number[]>} The tribunal codes of each órgão code.
 */
export const getProcessoJuridicoTribunals = (): ReadonlyMap<number, readonly number[]> =>
	(tribunals ??= new Map([
		[1, [SUPERIOR_COURT]],
		[2, [SUPERIOR_COURT]],
		[3, [SUPERIOR_COURT]],
		[4, [...range(1, 6), COUNCIL]],
		[5, [SUPERIOR_COURT, ...range(1, 24), COUNCIL]],
		[6, [SUPERIOR_COURT, ...range(1, 27)]],
		[7, [SUPERIOR_COURT, ...range(1, 12)]],
		[8, range(1, 27)],
		[9, [13, 21, 26]],
	]));
