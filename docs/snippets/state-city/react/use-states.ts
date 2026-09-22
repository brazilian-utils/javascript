import { useEffect, useRef, useState } from "react";
import type { State } from "@brazilian-utils/brazilian-utils";

/**
 * The states, fetched the first time the select is opened. 2.5 KB that a page whose visitor never
 * opens it does not pay for, and the browser keeps the module once it has it. `import()` takes no
 * signal, so the module is not stopped, only what is done with it: a table that arrives after the
 * component is gone is dropped.
 */
export function useStates() {
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(false);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);

  const load = async () => {
    if (loading || states.length > 0) return;

    const controller = new AbortController();

    pending.current = controller;
    setLoading(true);

    const { getStates } = await import("@brazilian-utils/brazilian-utils/get-states");

    if (controller.signal.aborted) return;

    setStates(getStates());
    setLoading(false);
  };

  return { states, loading, load };
}
