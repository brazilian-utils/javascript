import { computed, ref, toValue, watch, type MaybeRefOrGetter } from "vue";
import type { StateCode } from "@brazilian-utils/brazilian-utils";

/**
 * The cities of a state, fetched the first time that state's select is opened. The table is
 * 154 KB, so nothing is fetched until someone means to pick a city, and the browser keeps the
 * module once it has it. `import()` takes no signal, so the module is not stopped, only what is
 * done with it: a table that arrives for a state that is no longer picked, or after the component
 * is gone, is dropped.
 */
export function useCitiesOfState(state: MaybeRefOrGetter<string>) {
  const loaded = ref({ state: "", cities: [] as string[] });
  const asked = ref("");
  const pending = ref<AbortController>();

  // Both of these are about the state that is picked, so picking another one leaves the cities of
  // the old state behind rather than on screen, and its spinner with them.
  const cities = computed(() =>
    loaded.value.state === toValue(state) ? loaded.value.cities : [],
  );
  const loading = computed(
    () => toValue(state) !== "" && asked.value === toValue(state) && cities.value.length === 0,
  );

  // What is on its way is dropped when another state is picked and when the scope goes.
  watch(
    () => toValue(state),
    (_current, _previous, onCleanup) => onCleanup(() => pending.value?.abort()),
  );

  const load = async () => {
    const current = toValue(state);

    if (!current || loading.value || cities.value.length > 0) return;

    const controller = new AbortController();

    pending.value = controller;
    asked.value = current;

    const { getCities } = await import("@brazilian-utils/brazilian-utils/get-cities");

    if (controller.signal.aborted) return;

    loaded.value = { state: current, cities: getCities(current as StateCode) };
  };

  return { cities, loading, load };
}
