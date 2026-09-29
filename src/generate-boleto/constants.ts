/**
 * The fator de vencimento of a slip with no due date. Carta-Circular BCB nº 2.926/2000 puts `0000`
 * there. The factor counts from the base date 07/10/1997 (Bradesco's cobrança manual); it reached 1000 on 03/07/2000, and FEBRABAN restarted it
 * at 1000, not at 0001, when it passed 9999 on 22/02/2025, so `0000` is the only factor below
 * 1000 a slip carries today.
 */
export const NO_DUE_DATE_FACTOR = "0000";

/** The lowest fator de vencimento that denotes a date, 03/07/2000 in the first cycle. */
export const MIN_DUE_DATE_FACTOR = 1000;

/** The highest fator de vencimento, the last day of a cycle (21/02/2025 in the first one). */
export const MAX_DUE_DATE_FACTOR = 9999;
