import { Component, computed, signal } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { DOCUMENTS, DocumentField, type DocumentKind } from "./document-field";

@Component({
  selector: "app-document-form",
  imports: [ReactiveFormsModule, DocumentField],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <label>
        Document
        <select [value]="kind()" (change)="selectKind($event)">
          @for (document of documents; track document.kind) {
            <option [value]="document.kind">{{ document.label }}</option>
          }
        </select>
      </label>

      <app-document-field [kind]="kind()" formControlName="value" />
      @if (value.touched && value.invalid) {
        <p role="alert">Enter a valid {{ spec().label }}</p>
      }

      <button type="submit">Submit</button>
    </form>
  `,
})
export class DocumentForm {
  protected readonly documents = Object.entries(DOCUMENTS).map(([kind, spec]) => ({
    kind: kind as DocumentKind,
    label: spec.label,
  }));

  protected readonly kind = signal<DocumentKind>("cpf");
  protected readonly spec = computed(() => DOCUMENTS[this.kind()]);
  protected readonly form = new FormGroup({
    value: new FormControl("", {
      nonNullable: true,
      validators: (control) =>
        this.spec().validator(control.value) ? null : { document: true },
    }),
  });

  protected get value() {
    return this.form.controls.value;
  }

  protected selectKind(event: Event) {
    this.kind.set((event.target as HTMLSelectElement).value as DocumentKind);
    this.form.reset();
  }

  protected submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();

    console.log(this.form.getRawValue());
  }
}
