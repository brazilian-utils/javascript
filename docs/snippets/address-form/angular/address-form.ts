import { Component, effect, signal } from "@angular/core";
import { Field } from "./field";
import { CepField } from "./cep-field";
import { addressByCep } from "./address-by-cep";

@Component({
  selector: "app-address-form",
  imports: [Field, CepField],
  template: `
    <form>
      <app-cep-field
        [value]="cep()"
        (valueChange)="cep.set($event)"
        [errorMessage]="status()"
      />

      <!-- The same field the document field guide builds, told what it is about. -->
      <app-field
        label="Street"
        autocomplete="address-line1"
        [value]="street()"
        (valueChange)="street.set($event)"
      />
      <app-field
        label="Neighborhood"
        [value]="neighborhood()"
        (valueChange)="neighborhood.set($event)"
      />
      <app-field
        label="City"
        autocomplete="address-level2"
        [value]="city()"
        (valueChange)="city.set($event)"
      />
      <app-field
        label="State"
        autocomplete="address-level1"
        [value]="state()"
        (valueChange)="state.set($event)"
      />
    </form>
  `,
})
export class AddressForm {
  protected readonly cep = signal("");
  protected readonly street = signal("");
  protected readonly neighborhood = signal("");
  protected readonly city = signal("");
  protected readonly state = signal("");

  private readonly address = addressByCep(this.cep);

  protected status() {
    if (this.address.isLoading()) return "Looking it up…";

    return this.address.error() ? "No address for this CEP" : "";
  }

  // What the lookup found is what the form starts from; it stays editable from there. Asking a
  // resource for a value it does not have throws, so it is asked whether it has one first.
  private readonly fill = effect(() => {
    if (!this.address.hasValue()) return;

    const found = this.address.value();

    this.street.set(found.street);
    this.neighborhood.set(found.neighborhood);
    this.city.set(found.city);
    this.state.set(found.state);
  });
}
