import { useCallback, useEffect, useRef, useState } from "react";
import { getAddressInfoByCep, type AddressInfo } from "@brazilian-utils/brazilian-utils";

type Lookup =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; address: AddressInfo }
  | { status: "failed" };

/**
 * Looks a CEP up, one lookup at a time: a newer CEP makes the answer to the older one worthless,
 * and an answer that arrives after the form is gone has nowhere to go. `getAddressInfoByCep` takes
 * no signal, so the request itself is not stopped, but its answer is dropped.
 */
export function useAddressLookup() {
  const [lookup, setLookup] = useState<Lookup>({ status: "idle" });
  const pending = useRef<AbortController>(undefined);

  const start = useCallback(() => {
    pending.current?.abort();
    pending.current = new AbortController();

    return pending.current.signal;
  }, []);

  useEffect(() => () => pending.current?.abort(), []);

  const lookupCep = useCallback(
    async (cep: string) => {
      const signal = start();

      setLookup({ status: "loading" });

      try {
        const address = await getAddressInfoByCep(cep);

        if (!signal.aborted) setLookup({ status: "found", address });
      } catch {
        if (!signal.aborted) setLookup({ status: "failed" });
      }
    },
    [start],
  );

  const reset = useCallback(() => {
    start();
    setLookup({ status: "idle" });
  }, [start]);

  return { lookup, lookupCep, reset };
}
