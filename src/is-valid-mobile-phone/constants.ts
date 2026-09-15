/**
 * The first digit (N9) a Brazilian mobile access code may carry, per numbering rule.
 *
 * Version 1 is the pre-Resolução 749/2022 set kept for 2.3.0 compatibility. Version 2 is the
 * set of art. 12, I, "a" of the resolution: `“7”, "8" e “9”: Serviço Móvel Pessoal (SMP),
 * ressalvado o disposto no inciso II deste artigo`, the ressalva being art. 12, II, "a",
 * `“700”: Serviço Móvel Global por Satélite (SMGS)`, a series outside the SMP.
 *
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 */
export const MOBILE_VALID_FIRST_NUMBERS_V1 = [6, 7, 8, 9];
export const MOBILE_VALID_FIRST_NUMBERS_V2 = [7, 8, 9];

export const MOBILE_SATELLITE_PREFIX = "700";
