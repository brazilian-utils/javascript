import { useEffect, useState } from "react";
import {
  getAddressInfoByCep,
  isValidCep,
  type AddressInfo,
} from "@brazilian-utils/brazilian-utils";

export type Lookup =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; address: AddressInfo }
  | { status: "failed" };

/**
 * The address of a CEP, looked up as the CEP changes: an incomplete one is not worth asking about,
 * and the answer to a CEP that is no longer the one on screen is dropped, as is one that arrives
 * after the component is gone. `getAddressInfoByCep` takes no signal, so the request itself is not
 * stopped, only its answer is.
 */
export function useGetAddressByCep(cep: string): Lookup {
  const [lookup, setLookup] = useState<Lookup>({ status: "idle" });

  useEffect(() => {
    if (!isValidCep(cep)) {
      setLookup({ status: "idle" });
      return;
    }

    const controller = new AbortController();

    setLookup({ status: "loading" });

    getAddressInfoByCep(cep)
      .then((address) => {
        if (!controller.signal.aborted) setLookup({ status: "found", address });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLookup({ status: "failed" });
      });

    return () => controller.abort();
  }, [cep]);

  return lookup;
}
