import { Component, signal } from "@angular/core";
import { getStates } from "@brazilian-utils/brazilian-utils/get-states";
import { citiesOfState } from "./cities-of-state";

@Component({
  selector: "app-state-city",
  template: `
    <label for="state">State</label>
    <select id="state" (change)="state.set($any($event.target).value)">
      <option value="">Pick a state</option>
      @for (current of states; track current.code) {
        <option [value]="current.code">{{ current.name }}</option>
      }
    </select>

    <label for="city">City</label>
    <select id="city" [disabled]="cities().length === 0" [attr.aria-busy]="loading()">
      <option value="">{{ loading() ? "Loading the cities…" : "Pick a city" }}</option>
      @for (city of cities(); track city) {
        <option [value]="city">{{ city }}</option>
      }
    </select>
  `,
})
export class StateCity {
  // The states are a short list, so they come with the page.
  protected readonly states = getStates();
  protected readonly state = signal("");

  private readonly citiesOf = citiesOfState(this.state);

  protected readonly loading = this.citiesOf.isLoading;

  protected cities() {
    return this.citiesOf.value() ?? [];
  }
}
