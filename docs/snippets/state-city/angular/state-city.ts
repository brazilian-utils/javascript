import { Component, signal } from "@angular/core";
import { getStates } from "@brazilian-utils/brazilian-utils/get-states";
import type { StateCode } from "@brazilian-utils/brazilian-utils";

@Component({
  selector: "app-state-city",
  template: `
    <label for="state">State</label>
    <select id="state" (change)="onStateChange($event)">
      <option value="">Pick a state</option>
      @for (state of states; track state.code) {
        <option [value]="state.code">{{ state.name }}</option>
      }
    </select>

    <label for="city">City</label>
    <select id="city" [disabled]="cities().length === 0">
      <option value="">{{ loading() ? "Loading the cities…" : "Pick a city" }}</option>
      @for (city of cities(); track city) {
        <option [value]="city">{{ city }}</option>
      }
    </select>
  `,
})
export class StateCity {
  // The states are a short list and come with the page; the cities are 5,571 of them, so that
  // table is fetched only when a state is picked, and only once.
  protected readonly states = getStates();
  protected readonly cities = signal<string[]>([]);
  protected readonly loading = signal(false);

  protected async onStateChange(event: Event) {
    const state = (event.target as HTMLSelectElement).value;

    this.cities.set([]);

    if (!state) return;

    this.loading.set(true);

    const { getCities } = await import("@brazilian-utils/brazilian-utils/get-cities");

    this.cities.set(getCities(state as StateCode));
    this.loading.set(false);
  }
}
