import { ref } from "vue";
import type { State } from "@brazilian-utils/brazilian-utils";

/**
 * The states, fetched the first time the select is opened. 2.5 KB that a page whose visitor never
 * opens it does not pay for, and the browser keeps the module once it has it.
 */
export function useStates() {
  const states = ref<State[]>([]);
  const loading = ref(false);

  const load = async () => {
    if (loading.value || states.value.length > 0) return;

    loading.value = true;

    const { getStates } = await import("@brazilian-utils/brazilian-utils/get-states");

    states.value = getStates();
    loading.value = false;
  };

  return { states, loading, load };
}
