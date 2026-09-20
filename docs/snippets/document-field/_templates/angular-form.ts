import { Component } from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidatorFn,
} from "@angular/forms";
@@formImports@@
import { @@Name@@Field } from "./@@kind@@-field";

export const @@kind@@Validator: ValidatorFn = (control) =>
  @@validatorControl@@ ? null : { @@kind@@: true };

@Component({
  selector: "app-@@kind@@-form",
  imports: [ReactiveFormsModule, @@Name@@Field],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <app-@@kind@@-field formControlName="@@kind@@" />
      @if (form.controls.@@kind@@.touched && form.controls.@@kind@@.invalid) {
        <p role="alert">Enter a valid @@label@@</p>
      }
      <button type="submit">Submit</button>
    </form>
  `,
})
export class @@Name@@Form {
  protected readonly form = new FormGroup({
    @@kind@@: new FormControl("", { nonNullable: true, validators: @@kind@@Validator }),
  });

  protected submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();

    console.log(this.form.getRawValue());
  }
}
