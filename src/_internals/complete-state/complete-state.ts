import { STATE_CAPITALS } from "../constants/state-capitals";
import { type State } from "../constants/states";

/**
 * Completes a state of `DATA` for a caller: a fresh object with the fields `DATA` leaves out,
 * the IBGE identifier of its region (the first digit of `ibgeCode`) and its capital, so mutating
 * what a state util returns never reaches the shared data or a later call.
 *
 * @param {State} state - An entry of `DATA`.
 * @returns {State} A fresh copy of the state, with `regionIbgeCode` and a fresh `capital`.
 *
 * @example
 * ```typescript
 * completeState(DATA[0]); // { code: "AC", ..., regionIbgeCode: 1, capital: { code: "1200401", name: "Rio Branco" } }
 * ```
 *
 * @see Official: https://servicodados.ibge.gov.br/api/v1/localidades/regioes
 * IBGE, API de Localidades, `regioes`: the identifier of each region, the first digit of the code
 * of each of its states.
 */
export const completeState = (state: State): State => {
	const [name, code] = STATE_CAPITALS[state.code];

	return Object.assign({}, state, {
		regionIbgeCode: Math.floor(state.ibgeCode / 10),
		capital: { code, name },
	});
};
