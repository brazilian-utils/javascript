import { Component } from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  type ValidatorFn,
} from "@angular/forms";
@@formImports@@
import { @@Name@@Field } from "./@@kind@@-field";

export const @@kind@@Validator: ValidatorFn = (control) =>
  !control.value || @@validatorControl@@ ? null : { @@kind@@: true };

@Component({
  selector: "app-@@kind@@-form",
  imports: [ReactiveFormsModule, @@Name@@Field],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <app-@@kind@@-field
        formControlName="@@kind@@"
        [aria-invalid]="control.touched && control.invalid"
        aria-describedby="@@kind@@-error"
      />
      <!-- On the page from the start, and announced when it gets its text: nothing moves focus
           to the field here, so the message has to speak for itself. -->
      <p id="@@kind@@-error" role="alert">
        @if (control.touched && control.invalid) {
          {{ control.hasError("required") ? "Enter a @@label@@" : "Enter a valid @@label@@" }}
        }
      </p>
      <button type="submit">Submit</button>
    </form>
  `,
})
export class @@Name@@Form {
  protected readonly form = new FormGroup({
    @@kind@@: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, @@kind@@Validator],
    }),
  });

  protected get control() {
    return this.form.controls.@@kind@@;
  }

  protected submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();

    console.log(this.form.getRawValue());
  }
}
