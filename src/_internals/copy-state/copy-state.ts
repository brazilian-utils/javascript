import { type State } from "../constants/states";

/**
 * Copies a state of `DATA` for a caller: a fresh object whose `capital` is a fresh object too, so
 * mutating what a state util returns never reaches the shared data or a later call.
 *
 * @param {Required<State>} state - An entry of `DATA`, which fills every field.
 * @returns {Required<State>} A copy of the state, down to its capital.
 *
 * @example
 * ```typescript
 * copyState(DATA[0]); // { code: "AC", ..., capital: { code: "1200401", name: "Rio Branco" } }
 * ```
 */
export const copyState = (state: Required<State>): Required<State> =>
	Object.assign({}, state, { capital: Object.assign({}, state.capital) });
