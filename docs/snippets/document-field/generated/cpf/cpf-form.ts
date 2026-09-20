import { Component } from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidatorFn,
} from "@angular/forms";
import { isValidCpf } from "@brazilian-utils/brazilian-utils";
import { CpfField } from "./cpf-field";

export const cpfValidator: ValidatorFn = (control) =>
  isValidCpf(control.value) ? null : { cpf: true };

@Component({
  selector: "app-cpf-form",
  imports: [ReactiveFormsModule, CpfField],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <app-cpf-field formControlName="cpf" />
      @if (form.controls.cpf.touched && form.controls.cpf.invalid) {
        <p role="alert">Enter a valid CPF</p>
      }
      <button type="submit">Submit</button>
    </form>
  `,
})
export class CpfForm {
  protected readonly form = new FormGroup({
    cpf: new FormControl("", { nonNullable: true, validators: cpfValidator }),
  });

  protected submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();

    console.log(this.form.getRawValue());
  }
}
