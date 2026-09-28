import { resource, type Signal } from "@angular/core";
import { getAddressInfoByCep, isValidCep } from "@brazilian-utils/brazilian-utils";

/**
 * The address of a CEP, looked up as the CEP changes. A resource reloads when what it is about
 * changes, drops the answer to a CEP that is no longer the one on screen and stops with the
 * component that asked. `getAddressInfoByCep` takes no signal, so the request itself is not
 * stopped, only its answer is.
 */
export function addressByCep(cep: Signal<string>) {
  return resource({
    // An incomplete CEP is not worth asking about, and a resource with nothing to ask about waits.
    params: () => (isValidCep(cep()) ? cep() : undefined),
    loader: ({ params }) => getAddressInfoByCep(params),
  });
}
