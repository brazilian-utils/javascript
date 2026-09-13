/**
 * The "fator de vencimento" (expiration factor) counts days since a FEBRABAN base date and
 * cycles every `CYCLE_LENGTH` days once it reaches its 4-digit maximum. FEBRABAN Comunicado
 * FB-009/2023 sets the current cycle boundary: the factor reached its maximum, 9999, on
 * 21/02/2025 and restarted at 1000 on 22/02/2025.
 *
 * @see Official: https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20-%20C%C3%B3digo%20de%20Barras%20-%20Vers%C3%A3o%208%20-%2011_05_2026.pdf
 * @see Official: https://portal.febraban.org.br/pagina/3425/33/pt-br/layout-febraban
 */
export const DAY_IN_MS = 86_400_000;

export const BASE_DATE_YEAR = 1997;
export const BASE_DATE_MONTH = 9;
export const BASE_DATE_DAY = 7;

export const CYCLE_LENGTH = 9000;

export const MIN_FACTOR = 1000;

export const RANGE_BEFORE = 3000;

export const RANGE_AFTER = 5500;
