import { useCallback, useEffect, useRef, useState } from "react";
import type { StateCode } from "@brazilian-utils/brazilian-utils";

/**
 * The cities of a state, fetched the first time one is picked: the table is 154 KB, so it is not
 * part of the page. A state picked while the table is on its way wins, and a table that arrives
 * after the component is gone is dropped.
 */
export function useCities() {
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const pending = useRef<AbortController>(undefined);

  useEffect(() => () => pending.current?.abort(), []);

  const load = useCallback(async (state: string) => {
    pending.current?.abort();

    const controller = new AbortController();

    pending.current = controller;

    setCities([]);
    setLoading(Boolean(state));

    if (!state) return;

    // The browser fetches this once and keeps it; picking another state does not fetch it again.
    const { getCities } = await import("@brazilian-utils/brazilian-utils/get-cities");

    if (controller.signal.aborted) return;

    setCities(getCities(state as StateCode));
    setLoading(false);
  }, []);

  return { cities, loading, load };
}
