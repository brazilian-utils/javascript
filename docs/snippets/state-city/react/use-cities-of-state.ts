import { useEffect, useState } from "react";
import type { StateCode } from "@brazilian-utils/brazilian-utils";

/**
 * The cities of a state, fetched as the state changes. The table is 154 KB, so it is not part of
 * the page: it arrives with the first state picked, and the browser keeps it from there. A state
 * picked while it is on its way wins, and a table that arrives after the component is gone is
 * dropped.
 */
export function useCitiesOfState(state: string) {
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCities([]);

    if (!state) return;

    const controller = new AbortController();

    setLoading(true);

    import("@brazilian-utils/brazilian-utils/get-cities").then(({ getCities }) => {
      if (controller.signal.aborted) return;

      setCities(getCities(state as StateCode));
      setLoading(false);
    });

    return () => controller.abort();
  }, [state]);

  return { cities, loading };
}
