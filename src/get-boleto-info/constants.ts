/**
 * The "fator de vencimento" (expiration factor) counts days since the base date 07/10/1997 that
 * Carta-Circular BCB nº 2.926/2000 places in positions 6-9 of the barcode, and cycles every
 * `CYCLE_LENGTH` days once it reaches its 4-digit maximum: it reached 9999 on 21/02/2025 and
 * restarted at 1000 on 22/02/2025. FEBRABAN announced that reset in Comunicado FB-009/2023,
 * which is not published on FEBRABAN's public site; the Bradesco cobrança layout manual below
 * reproduces the rule and its correlation table.
 *
 * `RANGE_BEFORE` and `RANGE_AFTER` are a heuristic of this library, not a published rule.
 * Neither FEBRABAN nor the Banco Central publishes any way of telling an old cycle factor from
 * a new cycle one, so every factor resolves to either of two dates `CYCLE_LENGTH` days apart.
 * These two windows pick between them, which means the date a factor resolves to depends on the
 * `referenceDate` given to `getBoletoInfo` and can change as that reference moves.
 *
 * @see Official: https://www.bcb.gov.br/pre/normativos/c_circ/2000/pdf/c_circ_2926_v1_O.pdf
 * @see Official: https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%208%20-%2011_05_2026.pdf
 * @see Official: https://portal.febraban.org.br/pagina/3425/33/pt-br/layout-febraban
 * @see Based on: https://banco.bradesco/assets/pessoajuridica/pdf/4008-524-0121-layout-cobranca-versao-portugues.pdf
 * Bradesco "Layout da Cobrança" manual: base date 07/10/1997, 03/07/2000 = 1000, 21/02/2025 = 9999
 * and a restart at 1000 on 22/02/2025.
 */
export const DAY_IN_MS = 86_400_000;

export const BASE_DATE_YEAR = 1997;
export const BASE_DATE_MONTH = 9;
export const BASE_DATE_DAY = 7;

export const CYCLE_LENGTH = 9000;

/**
 * The earliest cycle the two candidate search may consider. The factor only started carrying
 * 1000 on 03/07/2000, so the base date is the oldest day the field can denote: a negative cycle
 * would place a factor before 07/10/1997, a date no fator de vencimento can express (and one the
 * same function already refuses to read out of a literal factor below `MIN_FACTOR`). A
 * `referenceDate` early enough to make the arithmetic yield a negative cycle is clamped here.
 */
export const FIRST_CYCLE = 0;

export const MIN_FACTOR = 1000;

export const RANGE_BEFORE = 3000;

export const RANGE_AFTER = 5500;
