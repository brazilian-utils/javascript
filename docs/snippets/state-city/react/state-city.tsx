import { useId } from "react";
import { getStates } from "@brazilian-utils/brazilian-utils/get-states";
import { useCities } from "./use-cities";

// The states are a short list, so they come with the page.
const states = getStates();

export function StateCity() {
  const id = useId();
  const { cities, loading, load } = useCities();

  return (
    <>
      <label htmlFor={id}>State</label>
      <select id={id} onChange={(event) => load(event.currentTarget.value)}>
        <option value="">Pick a state</option>
        {states.map((state) => (
          <option key={state.code} value={state.code}>
            {state.name}
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
