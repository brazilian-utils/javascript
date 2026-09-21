import { Component, effect, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { Field } from "./field";
import { CepField } from "./cep-field";
import { addressByCep } from "./address-by-cep";

@Component({
  selector: "app-address-form",
  imports: [ReactiveFormsModule, Field, CepField],
  template: `
    <form [formGroup]="form">
      <app-cep-field formControlName="cep" [errorMessage]="status()" />

      <!-- The same field the document field guide builds, told what it is about. -->
      <app-field label="Street" autocomplete="address-line1" formControlName="street" />
      <app-field label="Neighborhood" formControlName="neighborhood" />
      <app-field label="City" autocomplete="address-level2" formControlName="city" />
      <app-field label="State" autocomplete="address-level1" formControlName="state" />
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

  // The control is what the field writes to, so the lookup answers to it.
  private readonly cep = signal("");
  private readonly address = addressByCep(this.cep);

  private readonly typing = this.form.controls.cep.valueChanges.subscribe((cep) =>
    this.cep.set(cep),
  );

  protected status() {
    if (this.address.isLoading()) return "Looking it up…";

    return this.address.error() ? "No address for this CEP" : "";
  }

  // What the lookup found is what the form starts from; it stays editable from there.
  private readonly fill = effect(() => {
    const found = this.address.value();

    if (found === undefined) return;

    const { street, neighborhood, city, state } = found;

    this.form.patchValue({ street, neighborhood, city, state });
  });
}
