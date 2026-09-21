import { resource, type Signal } from "@angular/core";
import type { StateCode } from "@brazilian-utils/brazilian-utils";

/**
 * The cities of a state, fetched as the state changes. The table is 154 KB, so it is not part of
 * the page: it arrives with the first state picked, and the browser keeps it from there. A
 * resource reloads when the state changes, drops a table that is no longer the state on screen
 * and stops with the component that asked.
 */
export function citiesOfState(state: Signal<string>) {
  return resource({
    // A resource with nothing to ask about waits, which is the state of an empty select.
    params: () => state() || undefined,
    loader: async ({ params }) => {
      const { getCities } = await import("@brazilian-utils/brazilian-utils/get-cities");

      return getCities(params as StateCode);
    },
  });
}
