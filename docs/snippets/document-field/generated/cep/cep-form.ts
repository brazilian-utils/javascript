import { Component } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { isValidCep } from "@brazilian-utils/brazilian-utils";
import { CepField } from "./cep-field";

@Component({
  selector: "app-cep-form",
  imports: [ReactiveFormsModule, CepField],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <app-cep-field formControlName="cep" />
      @if (form.controls.cep.touched && form.controls.cep.invalid) {
        <p role="alert">Enter a valid CEP</p>
      }
      <button type="submit">Submit</button>
    </form>
  `,
})
export class CepForm {
  protected readonly form = new FormGroup({
    cep: new FormControl("", {
      nonNullable: true,
      validators: (control) => (isValidCep(control.value) ? null : { cep: true }),
    }),
  });

  protected submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();

    console.log(this.form.getRawValue());
  }
}
