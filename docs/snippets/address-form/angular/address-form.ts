import { Component, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import {
  formatCep,
  getAddressInfoByCep,
  isValidCep,
} from "@brazilian-utils/brazilian-utils";

@Component({
  selector: "app-address-form",
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="$event.preventDefault()">
      <label for="cep">CEP</label>
      <input
        id="cep"
        formControlName="cep"
        inputmode="numeric"
        autocomplete="postal-code"
        placeholder="00000-000"
        aria-describedby="cep-status"
        (input)="onCepChange($event)"
      />
      <!-- On the page from the start, and announced when it gets its text. -->
      <output id="cep-status">{{ status() }}</output>

      <label for="street">Street</label>
      <input id="street" formControlName="street" autocomplete="address-line1" />

      <label for="neighborhood">Neighborhood</label>
      <input id="neighborhood" formControlName="neighborhood" />

      <label for="city">City</label>
      <input id="city" formControlName="city" autocomplete="address-level2" />

      <label for="state">State</label>
      <input
        id="state"
        formControlName="state"
        autocomplete="address-level1"
        maxlength="2"
      />
    </form>
  `,
})
export class AddressForm {
  protected readonly status = signal("");
  protected readonly form = new FormGroup({
    cep: new FormControl("", { nonNullable: true }),
    street: new FormControl("", { nonNullable: true }),
    neighborhood: new FormControl("", { nonNullable: true }),
    city: new FormControl("", { nonNullable: true }),
    state: new FormControl("", { nonNullable: true }),
  });

  protected async onCepChange(event: Event) {
    const cep = formatCep((event.target as HTMLInputElement).value);

    this.form.controls.cep.setValue(cep);

    // The lookup is worth a request only once the CEP is complete.
    if (!isValidCep(cep)) return this.status.set("");

    this.status.set("Looking up…");

    try {
      const { street, neighborhood, city, state } = await getAddressInfoByCep(cep);

      this.form.patchValue({ street, neighborhood, city, state });
      this.status.set("");
    } catch {
      this.form.patchValue({ street: "", neighborhood: "", city: "", state: "" });
      this.status.set("No address for this CEP");
    }
  }
}
