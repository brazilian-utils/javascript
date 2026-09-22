import { useEffect, useRef, useState } from "react";
import type { StateCode } from "@brazilian-utils/brazilian-utils";

/**
 * The cities of a state, fetched the first time that state's select is opened. The table is
 * 154 KB, so nothing is fetched until someone means to pick a city, and the browser keeps the
 * module once it has it. `import()` takes no signal, so the module is not stopped, only what is
 * done with it: a table that arrives for a state that is no longer picked, or after the component
 * is gone, is dropped.
 */
export function useCitiesOfState(state: string) {
  const [loaded, setLoaded] = useState({ state: "", cities: [] as string[] });
  const [asked, setAsked] = useState("");
  const pending = useRef<AbortController | null>(null);

  // Both of these are about the state that is picked, so picking another one leaves the cities of
  // the old state behind rather than on screen, and its spinner with them.
  const cities = loaded.state === state ? loaded.cities : [];
  const loading = state !== "" && asked === state && cities.length === 0;

  // What is on its way is dropped when another state is picked and when the component goes.
  useEffect(() => () => pending.current?.abort(), [state]);

  const load = async () => {
    if (!state || loading || cities.length > 0) return;

    const controller = new AbortController();

    pending.current = controller;
    setAsked(state);

    const { getCities } = await import("@brazilian-utils/brazilian-utils/get-cities");

    if (controller.signal.aborted) return;

    setLoaded({ state, cities: getCities(state as StateCode) });
  };

  return { cities, loading, load };
}
