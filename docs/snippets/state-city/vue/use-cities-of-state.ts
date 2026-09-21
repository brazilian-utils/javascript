import { ref, toValue, watch, type MaybeRefOrGetter } from "vue";
import type { StateCode } from "@brazilian-utils/brazilian-utils";

/**
 * The cities of a state, fetched as the state changes. The table is 154 KB, so it is not part of
 * the page: it arrives with the first state picked, and the browser keeps it from there. A state
 * picked while it is on its way wins, and a table that arrives after the component is gone is
 * dropped.
 */
export function useCitiesOfState(state: MaybeRefOrGetter<string>) {
  const cities = ref<string[]>([]);
  const loading = ref(false);

  watch(
    () => toValue(state),
    (current, _previous, onCleanup) => {
      cities.value = [];

      if (!current) return;

      const controller = new AbortController();

      onCleanup(() => controller.abort());
      loading.value = true;

      import("@brazilian-utils/brazilian-utils/get-cities").then(({ getCities }) => {
        if (controller.signal.aborted) return;

        cities.value = getCities(current as StateCode);
        loading.value = false;
      });
    },
    { immediate: true },
  );

  return { cities, loading };
}
