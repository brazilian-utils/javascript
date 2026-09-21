import { Component, EventEmitter, Input, Output, forwardRef, signal } from "@angular/core";
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
@@fieldImports@@
import { Field } from "./field";

/** The field of the form, with what makes it a @@label@@ and nothing else. */
@Component({
  selector: "app-@@kind@@-field",
  imports: [Field],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => @@Name@@Field), multi: true },
  ],
  template: `
    <app-field
      label="@@label@@"
      inputMode="@@inputMode@@"
      autocomplete="@@autocomplete@@"
      placeholder="@@placeholder@@"
      [mask]="mask"
      [errorMessage]="errorMessage"
      [value]="value()"
      (valueChange)="onValue($event)"
      (touched)="onTouched()"
    />
  `,
})
export class @@Name@@Field implements ControlValueAccessor {
  /** What the form says is wrong with the value, if anything. */
  @Input() errorMessage?: string;

  /** The @@label@@ without its mask, for a field bound with `[(value)]` rather than to a form. */
  @Input("value") set boundValue(value: string) {
    this.value.set(value ?? "");
  }

  @Output() readonly valueChange = new EventEmitter<string>();

  protected readonly mask = { format: @@format@@, parse: @@parse@@ };
  protected readonly value = signal("");

  protected onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ?? "");
  }

  registerOnChange(onChange: (value: string) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  protected onValue(value: string) {
    this.value.set(value);
    this.onChange(value);
    this.valueChange.emit(value);
  }
}
