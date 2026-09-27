import { REGIONS, type Region } from "../_internals/constants/regions";

export type { Region, RegionCode } from "../_internals/constants/regions";

/**
 * Retrieves the five Brazilian regions (Grandes Regiões) with their code, name and IBGE
 * identifier, in the order of that identifier: Norte (1), Nordeste (2), Sudeste (3), Sul (4) and
 * Centro-Oeste (5). The `code` is the same `State["regionCode"]` every state carries.
 *
 * Each call returns a fresh array of fresh objects, so mutating the result never affects the
 * underlying data or later calls.
 *
 * @returns {Region[]} The five regions.
 *
 * @example
 * ```typescript
 * getRegions()[0]; // { code: "N", name: "Norte", ibgeCode: 1 }
 * getRegions().map((region) => region.code); // ["N", "NE", "SE", "S", "CO"]
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/v1/localidades/regioes
 * IBGE, API de Localidades, `regioes`.
 */
export const getRegions = (): Region[] => REGIONS.map((region) => Object.assign({}, region));
