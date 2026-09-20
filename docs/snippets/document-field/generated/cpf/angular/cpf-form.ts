import { Component } from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  type ValidatorFn,
} from "@angular/forms";
import { isValidCpf } from "@brazilian-utils/brazilian-utils";
import { CpfField } from "./cpf-field";

export const cpfValidator: ValidatorFn = (control) =>
  !control.value || isValidCpf(control.value) ? null : { cpf: true };

@Component({
  selector: "app-cpf-form",
  imports: [ReactiveFormsModule, CpfField],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <app-cpf-field formControlName="cpf" [errorMessage]="errorMessage()" />
      <button type="submit">Submit</button>
    </form>
  `,
})
export class CpfForm {
  protected readonly form = new FormGroup({
    cpf: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, cpfValidator],
    }),
  });

  protected get control() {
    return this.form.controls.cpf;
  }

  protected errorMessage(): string | undefined {
    if (this.control.valid || this.control.untouched) return undefined;

    return this.control.hasError("required") ? "Enter a CPF" : "Enter a valid CPF";
  }

  protected submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();

    console.log(this.form.getRawValue());
  }
}
