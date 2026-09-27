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
 * Resolução Anatel nº 777/2025, art. 22, rewrites that item so that from 1 March 2027 the `700`
 * series is "SMGS e SMP por Satélite": from that date a `700` number can be an SMP mobile number
 * too, and version 2 may have to accept it. Nothing changes before then.
 *
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2022/1641-resolucao-749
 * @see Official: https://informacoes.anatel.gov.br/legislacao/resolucoes/2025/2022-resolucao-777
 * Resolução Anatel nº 777/2025, art. 22: the `700` series becomes "SMGS e SMP por Satélite" on 1
 * March 2027.
 */
export const MOBILE_SATELLITE_PREFIX = "700";
