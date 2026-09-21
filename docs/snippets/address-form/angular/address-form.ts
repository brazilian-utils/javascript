import { Component, DestroyRef, effect, inject } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { formatCep, isValidCep } from "@brazilian-utils/brazilian-utils";
import { AddressLookup } from "./address-lookup";

const EMPTY = { street: "", neighborhood: "", city: "", state: "" };
const STATUS = {
  idle: "",
  loading: "Looking it up…",
  found: "",
  failed: "No address for this CEP",
};

@Component({
  selector: "app-address-form",
  imports: [ReactiveFormsModule],
  providers: [AddressLookup],
  template: `
    <form [formGroup]="form">
      <label for="cep">CEP</label>
      <input
        id="cep"
        formControlName="cep"
        inputmode="numeric"
        autocomplete="postal-code"
        placeholder="00000-000"
        aria-describedby="cep-status"
        [attr.aria-busy]="lookup.lookup().status === 'loading'"
      />
      <!-- On the page from the start, and announced when it gets its text. -->
      <output id="cep-status">{{ STATUS[lookup.lookup().status] }}</output>

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
  protected readonly STATUS = STATUS;
  protected readonly lookup = inject(AddressLookup);

  protected readonly form = new FormGroup({
    cep: new FormControl("", { nonNullable: true }),
    street: new FormControl("", { nonNullable: true }),
    neighborhood: new FormControl("", { nonNullable: true }),
    city: new FormControl("", { nonNullable: true }),
    state: new FormControl("", { nonNullable: true }),
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.typing.unsubscribe());
  }

  // What the lookup found is what the form starts from; it stays editable from there.
  private readonly fill = effect(() => {
    const current = this.lookup.lookup();

    // Only the fields the lookup is about: writing the CEP back would start another lookup.
    if (current.status === "found") {
      const { street, neighborhood, city, state } = current.address;

      this.form.patchValue({ street, neighborhood, city, state });
    }

    if (current.status === "failed") this.form.patchValue(EMPTY);
  });

  // The control is what the field writes to, so the mask and the lookup answer to it rather than
  // to the event: a value accessor would write the raw value back over a formatted one.
  private readonly typing = this.form.controls.cep.valueChanges.subscribe((typed) => {
    const cep = formatCep(typed);

    if (cep !== typed) this.form.controls.cep.setValue(cep, { emitEvent: false });

    // Asking before the CEP is complete is asking for nothing.
    if (isValidCep(cep)) this.lookup.lookupCep(cep);
    else this.lookup.reset();
  });
}
