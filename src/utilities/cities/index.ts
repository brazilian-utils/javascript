import { CITIES_DATA } from '../../common/cities';

import { StateCode, StateName, getStates } from '../states';

const sortAlphabetically = (cityA: string, cityB: string) => cityA.localeCompare(cityB);

/**
 * Returns a list of city names for a given Brazilian state, or all cities if no state is specified.
 *
 * If a state name or code is provided, the function searches for the corresponding state and returns its cities sorted alphabetically.
 * If no state is provided, it returns all cities from all states, sorted alphabetically.
 *
 * @param state - The name or code of the Brazilian state to filter cities by. Optional.
 * @returns An array of city names, sorted alphabetically. Returns an empty array if the state is not found.
 */
export function getCities(state?: StateName | StateCode): string[] {
  if (state) {
    const states = getStates();

    const foundState = states.find(({ name, code }) => name === state || code === state);

    if (!foundState) {
      return [];
    }

    return CITIES_DATA[foundState.code].sort(sortAlphabetically);
  }

  return Object.values(CITIES_DATA)
    .reduce((acc, city) => acc.concat(city), [])
    .sort(sortAlphabetically);
}
