import { useId, useState } from "react";
import { getStates } from "@brazilian-utils/brazilian-utils/get-states";
import { useCitiesOfState } from "./use-cities-of-state";

// The states are a short list, so they come with the page.
const states = getStates();

export function StateCity() {
  const id = useId();
  const [state, setState] = useState("");
  const { cities, loading } = useCitiesOfState(state);

  return (
    <>
      <label htmlFor={id}>State</label>
      <select
        id={id}
        value={state}
        onChange={(event) => setState(event.currentTarget.value)}
      >
        <option value="">Pick a state</option>
        {states.map((current) => (
          <option key={current.code} value={current.code}>
            {current.name}
          </option>
        ))}
      </select>

      <label htmlFor={`${id}-city`}>City</label>
      <select id={`${id}-city`} disabled={cities.length === 0} aria-busy={loading}>
        <option value="">{loading ? "Loading the cities…" : "Pick a city"}</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
    </>
  );
}
