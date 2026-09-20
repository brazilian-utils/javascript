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
      <app-cep-field
        formControlName="cep"
        [aria-invalid]="control.touched && control.invalid"
        aria-describedby="cep-error"
      />
      <!-- On the page from the start, and announced when it gets its text: nothing moves focus
           to the field here, so the message has to speak for itself. -->
      <p id="cep-error" role="alert">
        @if (control.touched && control.invalid) {
          {{ control.hasError("required") ? "Enter a CEP" : "Enter a valid CEP" }}
        }
      </p>
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

  protected submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();

    console.log(this.form.getRawValue());
  }
}
