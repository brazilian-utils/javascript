import { DestroyRef, Injectable, inject, signal } from "@angular/core";
import { Subject, from, map, of, startWith, switchMap } from "rxjs";
import type { StateCode } from "@brazilian-utils/brazilian-utils";

/**
 * The cities of a state, fetched the first time one is picked: the table is 154 KB, so it is not
 * part of the page. `switchMap` drops a table that is no longer the state on screen, and the
 * subscription ends with the component that asked for it.
 */
@Injectable()
export class Cities {
  readonly cities = signal<string[]>([]);
  readonly loading = signal(false);

  private readonly state = new Subject<string>();

  private readonly changes = this.state
    .pipe(
      switchMap((state) =>
        state === ""
          ? of<string[]>([])
          : // The browser fetches this once and keeps it.
            from(import("@brazilian-utils/brazilian-utils/get-cities")).pipe(
              map(({ getCities }) => getCities(state as StateCode)),
              startWith<string[]>([]),
            ),
      ),
    )
    .subscribe((cities) => {
      this.cities.set(cities);
      this.loading.set(false);
    });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.changes.unsubscribe());
  }

  load(state: string) {
    this.loading.set(state !== "");
    this.state.next(state);
  }
}
