import { useId, useState } from "react";
import { useCitiesOfState } from "./use-cities-of-state";
import { useStates } from "./use-states";

export function StateCity() {
  const id = useId();
  const [state, setState] = useState("");
  const { states, loading: loadingStates, load: loadStates } = useStates();
  const { cities, loading: loadingCities, load: loadCities } = useCitiesOfState(state);

  return (
    <>
      <label htmlFor={id}>State</label>
      {/* Opening the select is what says the list is wanted, so that is when it is fetched. */}
      <select
        id={id}
        value={state}
        aria-busy={loadingStates}
        onFocus={loadStates}
        onChange={(event) => setState(event.currentTarget.value)}
      >
        <option value="">{loadingStates ? "Loading the states…" : "Pick a state"}</option>
        {states.map((current) => (
          <option key={current.code} value={current.code}>
            {current.name}
          </option>
        ))}
      </select>

      <label htmlFor={`${id}-city`}>City</label>
      <select id={`${id}-city`} disabled={!state} aria-busy={loadingCities} onFocus={loadCities}>
        <option value="">{loadingCities ? "Loading the cities…" : "Pick a city"}</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
    </>
  );
}
