import { resource, type Signal } from "@angular/core";
import type { StateCode } from "@brazilian-utils/brazilian-utils";

/**
 * The cities of a state, fetched the first time that state's select is opened. The table is
 * 154 KB, so nothing is fetched until someone means to pick a city. What it is about is the state
 * whose cities were asked for, so picking another state puts the resource back to waiting, and a
 * table that is no longer the state on screen is dropped.
 */
export function citiesOfState(asked: Signal<string>) {
  return resource({
    params: () => asked() || undefined,
    loader: async ({ params }) => {
      const { getCities } = await import("@brazilian-utils/brazilian-utils/get-cities");

      return getCities(params as StateCode);
    },
  });
}
