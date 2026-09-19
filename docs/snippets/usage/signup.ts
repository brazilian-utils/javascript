import { Component, signal } from "@angular/core";
import { form, FormField, validate } from "@angular/forms/signals";
import { isValidCpf } from "@brazilian-utils/brazilian-utils";
import { CpfField } from "./cpf-field";

@Component({
  selector: "app-signup",
  imports: [CpfField, FormField],
  template: `<app-cpf-field [formField]="signup.cpf" />`,
})
export class Signup {
  protected readonly signup = form(signal({ cpf: "" }), (path) => {
    validate(path.cpf, ({ value }) =>
      isValidCpf(value()) ? undefined : { kind: "cpf", message: "Invalid CPF" },
    );
  });
}
