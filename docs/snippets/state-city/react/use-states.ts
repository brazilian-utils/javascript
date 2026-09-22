import { useState } from "react";
import type { State } from "@brazilian-utils/brazilian-utils";

/**
 * The states, fetched the first time the select is opened. 2.5 KB that a page whose visitor never
 * opens it does not pay for, and the browser keeps the module once it has it.
 */
export function useStates() {
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (loading || states.length > 0) return;

    setLoading(true);

    const { getStates } = await import("@brazilian-utils/brazilian-utils/get-states");

    setStates(getStates());
    setLoading(false);
  };

  return { states, loading, load };
}
