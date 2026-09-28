import { onScopeDispose, ref } from "vue";
import type { State } from "@brazilian-utils/brazilian-utils";

/**
 * The states, fetched the first time the select is opened. 2.5 KB that a page whose visitor never
 * opens it does not pay for, and the browser keeps the module once it has it. `import()` takes no
 * signal, so the module is not stopped, only what is done with it: a table that arrives after the
 * component is gone is dropped.
 */
export function useStates() {
  const states = ref<State[]>([]);
  const loading = ref(false);
  const pending = ref<AbortController>();

  onScopeDispose(() => pending.value?.abort());

  const load = async () => {
    if (loading.value || states.value.length > 0) return;

    const controller = new AbortController();

    pending.value = controller;
    loading.value = true;

    const { getStates } = await import("@brazilian-utils/brazilian-utils/get-states");

    if (controller.signal.aborted) return;

    states.value = getStates();
    loading.value = false;
  };

  return { states, loading, load };
}
