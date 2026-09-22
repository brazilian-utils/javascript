import { computed, ref, toValue, type MaybeRefOrGetter } from "vue";
import type { StateCode } from "@brazilian-utils/brazilian-utils";

/**
 * The cities of a state, fetched the first time that state's select is opened. The table is
 * 154 KB, so nothing is fetched until someone means to pick a city, and picking another state
 * only marks what is on screen as no longer this state's — the table itself is fetched once and
 * the browser keeps it.
 */
export function useCitiesOfState(state: MaybeRefOrGetter<string>) {
  const loaded = ref({ state: "", cities: [] as string[] });
  const loading = ref(false);

  // What was loaded is only this state's cities while it is the state that is picked, which is
  // also what makes the answer to a state left behind harmless.
  const cities = computed(() =>
    loaded.value.state === toValue(state) ? loaded.value.cities : [],
  );

  const load = async () => {
    const current = toValue(state);

    if (!current || loading.value || cities.value.length > 0) return;

    loading.value = true;

    const { getCities } = await import("@brazilian-utils/brazilian-utils/get-cities");

    loaded.value = { state: current, cities: getCities(current as StateCode) };
    loading.value = false;
  };

  return { cities, loading, load };
}
