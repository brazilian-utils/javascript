import { Component } from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  type ValidatorFn,
} from "@angular/forms";
import { isValidCnpj } from "@brazilian-utils/brazilian-utils";
import { CnpjField } from "./cnpj-field";

export const cnpjValidator: ValidatorFn = (control) =>
  !control.value || isValidCnpj(control.value, { version: 2 }) ? null : { cnpj: true };

@Component({
  selector: "app-cnpj-form",
  imports: [ReactiveFormsModule, CnpjField],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <app-cnpj-field formControlName="cnpj" [errorMessage]="errorMessage()" />
      <button type="submit">Submit</button>
    </form>
  `,
})
export class CnpjForm {
  protected readonly form = new FormGroup({
    cnpj: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, cnpjValidator],
    }),
  });

  protected get control() {
    return this.form.controls.cnpj;
  }

  protected errorMessage(): string | undefined {
    if (this.control.valid || this.control.untouched) return undefined;

    return this.control.hasError("required") ? "Enter a CNPJ" : "Enter a valid CNPJ";
  }

  protected submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();

    console.log(this.form.getRawValue());
  }
}
