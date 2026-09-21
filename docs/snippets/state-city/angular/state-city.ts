import { Component, inject } from "@angular/core";
import { getStates } from "@brazilian-utils/brazilian-utils/get-states";
import { Cities } from "./cities";

@Component({
  selector: "app-state-city",
  providers: [Cities],
  template: `
    <label for="state">State</label>
    <select id="state" (change)="cities.load($any($event.target).value)">
      <option value="">Pick a state</option>
      @for (state of states; track state.code) {
        <option [value]="state.code">{{ state.name }}</option>
      }
    </select>

    <label for="city">City</label>
    <select
      id="city"
      [disabled]="cities.cities().length === 0"
      [attr.aria-busy]="cities.loading()"
    >
      <option value="">
        {{ cities.loading() ? "Loading the cities…" : "Pick a city" }}
      </option>
      @for (city of cities.cities(); track city) {
        <option [value]="city">{{ city }}</option>
      }
    </select>
  `,
})
export class StateCity {
  // The states are a short list, so they come with the page.
  protected readonly states = getStates();
  protected readonly cities = inject(Cities);
}
