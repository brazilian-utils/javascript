import { useState } from "react";
import type { StateCode } from "@brazilian-utils/brazilian-utils";

/**
 * The cities of a state, fetched the first time that state's select is opened. The table is
 * 154 KB, so nothing is fetched until someone means to pick a city, and picking another state
 * only marks what is on screen as no longer this state's — the table itself is fetched once and
 * the browser keeps it.
 */
export function useCitiesOfState(state: string) {
  const [loaded, setLoaded] = useState({ state: "", cities: [] as string[] });
  const [loading, setLoading] = useState(false);

  // What was loaded is only this state's cities while it is the state that is picked, which is
  // also what makes the answer to a state left behind harmless.
  const cities = loaded.state === state ? loaded.cities : [];

  const load = async () => {
    if (!state || loading || cities.length > 0) return;

    setLoading(true);

    const { getCities } = await import("@brazilian-utils/brazilian-utils/get-cities");

    setLoaded({ state, cities: getCities(state as StateCode) });
    setLoading(false);
  };

  return { cities, loading, load };
}
