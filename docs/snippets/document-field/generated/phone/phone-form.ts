import { Component } from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidatorFn,
} from "@angular/forms";
import { isValidPhone } from "@brazilian-utils/brazilian-utils";
import { PhoneField } from "./phone-field";

export const phoneValidator: ValidatorFn = (control) =>
  isValidPhone(control.value) ? null : { phone: true };

@Component({
  selector: "app-phone-form",
  imports: [ReactiveFormsModule, PhoneField],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <app-phone-field formControlName="phone" />
      @if (form.controls.phone.touched && form.controls.phone.invalid) {
        <p role="alert">Enter a valid Phone</p>
      }
      <button type="submit">Submit</button>
    </form>
  `,
})
export class PhoneForm {
  protected readonly form = new FormGroup({
    phone: new FormControl("", { nonNullable: true, validators: phoneValidator }),
  });

  protected submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();

    console.log(this.form.getRawValue());
  }
}
