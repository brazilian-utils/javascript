import { Component, signal } from "@angular/core";
import { citiesOfState } from "./cities-of-state";
import { states } from "./states";

@Component({
  selector: "app-state-city",
  template: `
    <label for="state">State</label>
    <!-- Opening the select is what says the list is wanted, so that is when it is fetched. -->
    <select
      id="state"
      [attr.aria-busy]="allStates.isLoading()"
      (focus)="askedForStates.set(true)"
      (change)="pick($any($event.target).value)"
    >
      <option value="">
        {{ allStates.isLoading() ? "Loading the states…" : "Pick a state" }}
      </option>
      @for (current of stateList(); track current.code) {
        <option [value]="current.code">{{ current.name }}</option>
      }
    </select>

    <label for="city">City</label>
    <select
      id="city"
      [disabled]="state() === ''"
      [attr.aria-busy]="cities.isLoading()"
      (focus)="askedForCities.set(state())"
    >
      <option value="">{{ cities.isLoading() ? "Loading the cities…" : "Pick a city" }}</option>
      @for (city of cityList(); track city) {
        <option [value]="city">{{ city }}</option>
      }
    </select>
  `,
  // A component is an element of its own; this one stands aside so the page lays out its rows.
  styles: `:host { display: contents; }`,
})
export class StateCity {
  protected readonly state = signal("");
  protected readonly askedForStates = signal(false);

  /** The state whose cities were asked for, which is nothing until a city select is opened. */
  protected readonly askedForCities = signal("");

  protected readonly allStates = states(this.askedForStates);
  protected readonly cities = citiesOfState(this.askedForCities);

  // Asking a resource for a value it does not have throws, so it is asked whether it has one.
  protected stateList() {
    return this.allStates.hasValue() ? this.allStates.value() : [];
  }

  protected cityList() {
    return this.cities.hasValue() ? this.cities.value() : [];
  }

  protected pick(state: string) {
    this.state.set(state);
    // The cities on screen are another state's; this one's are fetched when they are asked for.
    this.askedForCities.set("");
  }
}
