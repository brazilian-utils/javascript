import { DATA, type State } from "../_internals/constants/states";

/**
 * Retrieves a list of all Brazilian states with their codes and names.
 *
 * Returns an array of state objects containing the two-letter state code
 * and the full state name. The list is sorted by state name with `localeCompare`
 * in the "pt-BR" locale, so accented names land where a Brazilian reader expects
 * them: Pará, Paraíba, Paraná and Rio de Janeiro, Rio Grande do Norte, Rio Grande do Sul.
 *
 * Each call returns a fresh array of fresh objects, so mutating the result
 * (e.g. `getStates()[0].name = "X"`) never affects the underlying data or
 * subsequent calls.
 *
 * @returns {State[]} An array of all Brazilian states sorted by name
 *
 * @example
 * ```typescript
 * getStates()[0]; // { code: "AC", name: "Acre", regionCode: "N", regionName: "Norte", ibgeCode: 12 }
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/docs/localidades
 */
export const getStates = (): State[] => DATA.map((state) => Object.assign({}, state));
