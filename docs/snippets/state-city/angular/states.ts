import { resource, type Signal } from "@angular/core";

/**
 * The states, fetched the first time the select is opened. 2.5 KB that a page whose visitor never
 * opens it does not pay for, and the browser keeps the module once it has it.
 */
export function states(asked: Signal<boolean>) {
  return resource({
    // A resource with nothing to ask about waits, which is where this one starts.
    params: () => asked() || undefined,
    loader: async () => {
      const { getStates } = await import("@brazilian-utils/brazilian-utils/get-states");

      return getStates();
    },
  });
}
