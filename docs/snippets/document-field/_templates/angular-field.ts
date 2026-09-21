import { Directive, inject } from "@angular/core";
@@fieldImports@@
import { Field } from "./field";

/**
 * What makes a field a @@label@@ and nothing else: put `@@kind@@` on the field and it takes the
 * label, the mask and the keyboard of a @@label@@, `<app-field @@kind@@ formControlName="@@kind@@" />`.
 */
@Directive({ selector: "app-field[@@kind@@]" })
export class @@Name@@Field {
  private readonly field = inject(Field, { host: true });

  constructor() {
    this.field.label = "@@label@@";
    this.field.inputMode = "@@inputMode@@";
    this.field.autocomplete = "@@autocomplete@@";
    this.field.placeholder = "@@placeholder@@";
    this.field.mask = { format: @@format@@, parse: @@parse@@ };
  }
}
