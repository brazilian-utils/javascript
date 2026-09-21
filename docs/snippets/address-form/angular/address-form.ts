import { Component, effect, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { CepField } from "./cep-field";
import { addressByCep } from "./address-by-cep";

const EMPTY = { street: "", neighborhood: "", city: "", state: "" };

@Component({
  selector: "app-address-form",
  imports: [ReactiveFormsModule, CepField],
  template: `
    <form [formGroup]="form">
      <app-cep-field formControlName="cep" [errorMessage]="status()" />

      <label for="street">Street</label>
      <input id="street" formControlName="street" autocomplete="address-line1" />

      <label for="neighborhood">Neighborhood</label>
      <input id="neighborhood" formControlName="neighborhood" />

      <label for="city">City</label>
      <input id="city" formControlName="city" autocomplete="address-level2" />

      <label for="state">State</label>
      <input id="state" formControlName="state" autocomplete="address-level1" />
    </form>
  `,
})
export class AddressForm {
  protected readonly form = new FormGroup({
    cep: new FormControl("", { nonNullable: true }),
    street: new FormControl("", { nonNullable: true }),
    neighborhood: new FormControl("", { nonNullable: true }),
    city: new FormControl("", { nonNullable: true }),
    state: new FormControl("", { nonNullable: true }),
  });

  private readonly cep = signal("");
  private readonly address = addressByCep(this.cep);

  protected status() {
    if (this.address.isLoading()) return "Looking it up…";

    return this.address.error() ? "No address for this CEP" : "";
  }

  // The control is what the field writes to, so the lookup answers to it rather than to an event.
  private readonly typing = this.form.controls.cep.valueChanges.subscribe((cep) =>
    this.cep.set(cep),
  );

  // What the lookup found is what the form starts from; it stays editable from there.
  private readonly fill = effect(() => {
    const found = this.address.value();

    if (found === undefined) return;

    const { street, neighborhood, city, state } = found;

    this.form.patchValue({ street, neighborhood, city, state });
  });
}
