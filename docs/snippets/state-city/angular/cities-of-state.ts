import { resource, type Signal } from "@angular/core";
import type { StateCode } from "@brazilian-utils/brazilian-utils";

/**
 * The municipalities of a state, fetched the first time that state's select is opened. The table is
 * 76 KB, so nothing is fetched until someone means to pick a city. What it is about is the state
 * whose cities were asked for, so picking another state puts the resource back to waiting.
 *
 * A resource aborts a load it no longer wants and drops its answer, which is what the `abortSignal`
 * of the loader is for; `import()` takes none, so the module is not stopped, only what is done
 * with it, and here the resource does that by itself.
 */
export function citiesOfState(asked: Signal<string>) {
  return resource({
    params: () => asked() || undefined,
    loader: async ({ params }) => {
      const { getMunicipalities } = await import(
        "@brazilian-utils/brazilian-utils/get-municipalities"
      );

      return getMunicipalities(params as StateCode);
    },
  });
}
