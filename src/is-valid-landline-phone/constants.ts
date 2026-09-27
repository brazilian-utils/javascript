/**
 * The first digits (N8) a Brazilian 8 digit user access code may carry: art. 11, I, "a" of
 * Resolução Anatel nº 749/2022, `"2" a "6": Serviço Telefônico Fixo Comutado (STFC) e Serviço de
 * Comunicação Multimídia (SCM)`; every other digit is reserva técnica. The "57" STFC-FATB series
 * of art. 11, II was revoked by Resolução nº 768/2024.
 *
 * Resolução Anatel nº 777/2025, art. 21, rewrites art. 11 with effect from 1 March 2027 (the
 * date the Anatel compiled text gives it, after Acórdão nº 202/2025): only "2" to "5" stay STFC,
 * and the SCM moves to 9 digit numbers starting with 6 (art. 12 in the wording of art. 22). That
 * rule is scheduled, not in force, so 6 is still accepted; from that date a landline starting
 * with 6 will have to be rejected.
 *
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2025/2022-resolucao-777
 * Resolução Anatel nº 777/2025, arts. 21 and 22: the arts. 11 and 12 in force on 1 March 2027.
 */
export const LANDLINE_VALID_FIRST_NUMBERS = [2, 3, 4, 5, 6];
