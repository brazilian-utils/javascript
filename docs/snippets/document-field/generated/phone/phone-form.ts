import { Component } from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  type ValidatorFn,
} from "@angular/forms";
import { isValidPhone } from "@brazilian-utils/brazilian-utils";
import { PhoneField } from "./phone-field";

export const phoneValidator: ValidatorFn = (control) =>
  !control.value || isValidPhone(control.value) ? null : { phone: true };

@Component({
  selector: "app-phone-form",
  imports: [ReactiveFormsModule, PhoneField],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <app-phone-field
        formControlName="phone"
        [aria-invalid]="control.touched && control.invalid"
        aria-describedby="phone-error"
      />
      <!-- On the page from the start, and announced when it gets its text: nothing moves focus
           to the field here, so the message has to speak for itself. -->
      <p id="phone-error" role="alert">
        @if (control.touched && control.invalid) {
          {{ control.hasError("required") ? "Enter a Phone" : "Enter a valid Phone" }}
        }
      </p>
      <button type="submit">Submit</button>
    </form>
  `,
})
export class PhoneForm {
  protected readonly form = new FormGroup({
    phone: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, phoneValidator],
    }),
  });

  protected get control() {
    return this.form.controls.phone;
  }

  protected submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();

    console.log(this.form.getRawValue());
  }
}
