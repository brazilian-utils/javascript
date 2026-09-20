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
      <app-cpf-field
        formControlName="cpf"
        [aria-invalid]="control.touched && control.invalid"
        aria-describedby="cpf-error"
      />
      <!-- On the page from the start, and announced when it gets its text: nothing moves focus
           to the field here, so the message has to speak for itself. -->
      <p id="cpf-error" role="alert">
        @if (control.touched && control.invalid) {
          {{ control.hasError("required") ? "Enter a CPF" : "Enter a valid CPF" }}
        }
      </p>
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

  protected submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();

    console.log(this.form.getRawValue());
  }
}
