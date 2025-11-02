import { STATES, STATES_DATA, StateCode, StateName } from '../../common/states';

/**
 * Represents a Brazilian state with its code and full name.
 * @interface State
 * @property {StateCode} code - The two-letter state code (e.g., 'SP', 'RJ')
 * @property {StateName} name - The full name of the state (e.g., 'São Paulo', 'Rio de Janeiro')
 */
export interface State {
  code: StateCode;
  name: StateName;
}

export { StateCode, StateName };

/**
 * Compares two states by their names for sorting purposes.
 * Uses locale-aware string comparison.
 * 
 * @param {State} nameA - The first state to compare
 * @param {State} nameB - The second state to compare
 * @returns {number} A negative number if nameA comes before nameB, positive if after, 0 if equal
 * @private
 */
const stateNameComparer = ({ name: nameA }: State, { name: nameB }: State) => nameA.localeCompare(nameB);

/**
 * Sorts an array of states alphabetically by their names.
 * 
 * @param {State[]} states - The array of states to sort
 * @returns {State[]} A new array with states sorted alphabetically by name
 * @private
 */
const sortByStateName = (states: State[]): State[] => states.sort(stateNameComparer);

/**
 * Retrieves a list of all Brazilian states with their codes and names.
 * 
 * Returns an array of state objects containing the two-letter state code
 * and the full state name. The list is automatically sorted alphabetically
 * by state name.
 * 
 * @returns {State[]} An array of all Brazilian states sorted by name
 * 
 * @example
 * const states = getStates();
 * // Returns:
 * // [
 * //   { code: 'AC', name: 'Acre' },
 * //   { code: 'AL', name: 'Alagoas' },
 * //   { code: 'AP', name: 'Amapá' },
 * //   ...
 * //   { code: 'TO', name: 'Tocantins' }
 * // ]
 */
export function getStates(): State[] {
  const states = STATES.map((code) => ({
    code,
    name: STATES_DATA[code].name as StateName,
  }));

  return sortByStateName(states);
}