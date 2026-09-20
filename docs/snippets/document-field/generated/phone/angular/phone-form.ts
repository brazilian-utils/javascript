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
      <app-phone-field formControlName="phone" [errorMessage]="errorMessage()" />
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

  protected errorMessage(): string | undefined {
    if (this.control.valid || this.control.untouched) return undefined;

    return this.control.hasError("required") ? "Enter a Phone" : "Enter a valid Phone";
  }

  protected submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();

    console.log(this.form.getRawValue());
  }
}
