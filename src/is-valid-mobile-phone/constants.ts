/**
 * The first digits (N9) a Brazilian mobile access code may carry, under both numbering rules: art.
 * 12, I, "a" of Resolução Anatel nº 749/2022, `“7”, "8" e “9”: Serviço Móvel Pessoal (SMP),
 * ressalvado o disposto no inciso II deste artigo`. The ressalva is art. 12, II, "a", `“700”:
 * Serviço Móvel Global por Satélite (SMGS)`, a series outside the SMP, which only version 2 leaves
 * out. A first digit of 6 is not SMP under either version.
 *
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 */
export const MOBILE_VALID_FIRST_NUMBERS = [7, 8, 9];

/**
 * The `700` series version 2 rejects: art. 12, II, "a" of Resolução Anatel nº 749/2022 gives it to
 * the Serviço Móvel Global por Satélite (SMGS), not to the SMP.
 *
 * Resolução Anatel nº 777/2025, art. 22, rewrites the whole of art. 12 with effect from 1 March
 * 2027 (the date the Anatel compiled text gives it, after Acórdão nº 202/2025): N9 "6" becomes
 * the Serviço de Comunicação Multimídia (SCM), only "8" and "9" stay SMP, the `700` series
 * becomes "SMGS e SMP por Satélite", and every other first digit, a "7" outside `700` included,
 * becomes reserva técnica. That rule is scheduled, not in force, so neither version applies it
 * yet. A version 2 that follows it from that date will need to accept only 8 and 9 as the first
 * digit, plus the `700` series as satellite SMP, and to reject every other `7` number; 6 stays
 * rejected, now as SCM.
 *
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2025/2022-resolucao-777
 * Resolução Anatel nº 777/2025, art. 22: the new art. 12 of Resolução nº 749/2022, in force on 1
 * March 2027.
 */
export const MOBILE_SATELLITE_PREFIX = "700";
