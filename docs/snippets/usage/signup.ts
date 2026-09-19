import { Component } from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidatorFn,
} from "@angular/forms";
import { isValidCpf } from "@brazilian-utils/brazilian-utils";
import { CpfField } from "./cpf-field";

const cpfValidator: ValidatorFn = (control) =>
  isValidCpf(control.value) ? null : { cpf: true };

@Component({
  selector: "app-signup",
  imports: [ReactiveFormsModule, CpfField],
  template: `
    <form [formGroup]="signup" (ngSubmit)="submit()">
      <app-cpf-field formControlName="cpf" />
      @if (signup.controls.cpf.touched && signup.controls.cpf.hasError("cpf")) {
        <p role="alert">Enter a valid CPF</p>
      }
      <button type="submit">Sign up</button>
    </form>
  `,
})
export class Signup {
  protected readonly signup = new FormGroup({
    cpf: new FormControl("", { nonNullable: true, validators: cpfValidator }),
  });

  protected submit() {
    if (this.signup.invalid) return this.signup.markAllAsTouched();

    console.log(this.signup.getRawValue());
  }
}
