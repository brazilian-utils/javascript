import { onScopeDispose, ref } from "vue";
import type { StateCode } from "@brazilian-utils/brazilian-utils";

/**
 * The cities of a state, fetched the first time one is picked: the table is 154 KB, so it is not
 * part of the page. A state picked while the table is on its way wins, and a table that arrives
 * after the component is gone is dropped.
 */
export function useCities() {
  const cities = ref<string[]>([]);
  const loading = ref(false);
  let pending: AbortController | undefined;

  onScopeDispose(() => pending?.abort());

  const load = async (state: string) => {
    pending?.abort();
    pending = new AbortController();

    const { signal } = pending;

    cities.value = [];
    loading.value = Boolean(state);

    if (!state) return;

    // The browser fetches this once and keeps it; picking another state does not fetch it again.
    const { getCities } = await import("@brazilian-utils/brazilian-utils/get-cities");

    if (signal.aborted) return;

    cities.value = getCities(state as StateCode);
    loading.value = false;
  };

  return { cities, loading, load };
}
