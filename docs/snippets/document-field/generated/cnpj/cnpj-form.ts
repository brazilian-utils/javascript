import { Component } from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidatorFn,
} from "@angular/forms";
import { isValidCnpj } from "@brazilian-utils/brazilian-utils";
import { CnpjField } from "./cnpj-field";

export const cnpjValidator: ValidatorFn = (control) =>
  isValidCnpj(control.value, { version: 2 }) ? null : { cnpj: true };

@Component({
  selector: "app-cnpj-form",
  imports: [ReactiveFormsModule, CnpjField],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <app-cnpj-field formControlName="cnpj" />
      @if (form.controls.cnpj.touched && form.controls.cnpj.invalid) {
        <p role="alert">Enter a valid CNPJ</p>
      }
      <button type="submit">Submit</button>
    </form>
  `,
})
export class CnpjForm {
  protected readonly form = new FormGroup({
    cnpj: new FormControl("", { nonNullable: true, validators: cnpjValidator }),
  });

  protected submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();

    console.log(this.form.getRawValue());
  }
}
