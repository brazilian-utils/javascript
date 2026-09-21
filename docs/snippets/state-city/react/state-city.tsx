import { useId, useState } from "react";
import { getStates } from "@brazilian-utils/brazilian-utils/get-states";
import type { StateCode } from "@brazilian-utils/brazilian-utils";

// The states are a short list and come with the page; the cities are 5,571 of them, so that table
// is fetched only when a state is picked, and only once.
const states = getStates();

export function StateCity() {
  const id = useId();
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function onStateChange(state: string) {
    setCities([]);

    if (!state) return;

    setLoading(true);

    const { getCities } = await import("@brazilian-utils/brazilian-utils/get-cities");

    setCities(getCities(state as StateCode));
    setLoading(false);
  }

  return (
    <>
      <label htmlFor={id}>State</label>
      <select id={id} onChange={(event) => onStateChange(event.currentTarget.value)}>
        <option value="">Pick a state</option>
        {states.map((state) => (
          <option key={state.code} value={state.code}>
            {state.name}
          </option>
        ))}
      </select>

      <label htmlFor={`${id}-city`}>City</label>
      <select id={`${id}-city`} disabled={cities.length === 0}>
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
