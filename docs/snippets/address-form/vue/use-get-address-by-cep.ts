import { ref, toValue, watch, type MaybeRefOrGetter } from "vue";
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
export function useGetAddressByCep(cep: MaybeRefOrGetter<string>) {
  const lookup = ref<Lookup>({ status: "idle" });

  watch(
    () => toValue(cep),
    (current, _previous, onCleanup) => {
      if (!isValidCep(current)) {
        lookup.value = { status: "idle" };
        return;
      }

      const controller = new AbortController();

      onCleanup(() => controller.abort());
      lookup.value = { status: "loading" };

      getAddressInfoByCep(current)
        .then((address) => {
          if (!controller.signal.aborted) lookup.value = { status: "found", address };
        })
        .catch(() => {
          if (!controller.signal.aborted) lookup.value = { status: "failed" };
        });
    },
    { immediate: true },
  );

  return lookup;
}
