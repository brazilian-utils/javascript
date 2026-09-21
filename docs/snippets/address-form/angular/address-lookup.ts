import { DestroyRef, Injectable, inject, signal } from "@angular/core";
import { Subject, catchError, from, map, of, startWith, switchMap } from "rxjs";
import { getAddressInfoByCep, type AddressInfo } from "@brazilian-utils/brazilian-utils";

export type Lookup =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; address: AddressInfo }
  | { status: "failed" };

/**
 * Looks a CEP up, one lookup at a time: `switchMap` drops the answer to a CEP that is no longer
 * the one being typed, and the subscription ends with the component that asked for it.
 */
@Injectable()
export class AddressLookup {
  readonly lookup = signal<Lookup>({ status: "idle" });

  private readonly cep = new Subject<string | undefined>();

  private readonly changes = this.cep
    .pipe(
      switchMap((cep) =>
        cep === undefined
          ? of<Lookup>({ status: "idle" })
          : from(getAddressInfoByCep(cep)).pipe(
              map((address): Lookup => ({ status: "found", address })),
              catchError(() => of<Lookup>({ status: "failed" })),
              startWith<Lookup>({ status: "loading" }),
            ),
      ),
    )
    .subscribe((lookup) => this.lookup.set(lookup));

  constructor() {
    inject(DestroyRef).onDestroy(() => this.changes.unsubscribe());
  }

  lookupCep(cep: string) {
    this.cep.next(cep);
  }

  reset() {
    this.cep.next(undefined);
  }
}
