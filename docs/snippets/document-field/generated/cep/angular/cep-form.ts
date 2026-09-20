import { Component } from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  type ValidatorFn,
} from "@angular/forms";
import { isValidCep } from "@brazilian-utils/brazilian-utils";
import { CepField } from "./cep-field";

export const cepValidator: ValidatorFn = (control) =>
  !control.value || isValidCep(control.value) ? null : { cep: true };

@Component({
  selector: "app-cep-form",
  imports: [ReactiveFormsModule, CepField],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <app-cep-field formControlName="cep" [errorMessage]="errorMessage()" />
      <button type="submit">Submit</button>
    </form>
  `,
})
export class CepForm {
  protected readonly form = new FormGroup({
    cep: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, cepValidator],
    }),
  });

  protected get control() {
    return this.form.controls.cep;
  }

  protected errorMessage(): string | undefined {
    if (this.control.valid || this.control.untouched) return undefined;

    return this.control.hasError("required") ? "Enter a CEP" : "Enter a valid CEP";
  }

  protected submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();

    console.log(this.form.getRawValue());
  }
}
