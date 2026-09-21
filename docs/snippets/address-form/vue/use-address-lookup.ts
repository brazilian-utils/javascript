import { onScopeDispose, ref } from "vue";
import { getAddressInfoByCep, type AddressInfo } from "@brazilian-utils/brazilian-utils";

type Lookup =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; address: AddressInfo }
  | { status: "failed" };

/**
 * Looks a CEP up, one lookup at a time: a newer CEP makes the answer to the older one worthless,
 * and an answer that arrives after the component is gone has nowhere to go. `getAddressInfoByCep`
 * takes no signal, so the request itself is not stopped, but its answer is dropped.
 */
export function useAddressLookup() {
  const lookup = ref<Lookup>({ status: "idle" });
  let pending: AbortController | undefined;

  const start = () => {
    pending?.abort();
    pending = new AbortController();

    return pending.signal;
  };

  onScopeDispose(() => pending?.abort());

  const lookupCep = async (cep: string) => {
    const signal = start();

    lookup.value = { status: "loading" };

    try {
      const address = await getAddressInfoByCep(cep);

      if (!signal.aborted) lookup.value = { status: "found", address };
    } catch {
      if (!signal.aborted) lookup.value = { status: "failed" };
    }
  };

  const reset = () => {
    start();
    lookup.value = { status: "idle" };
  };

  return { lookup, lookupCep, reset };
}
