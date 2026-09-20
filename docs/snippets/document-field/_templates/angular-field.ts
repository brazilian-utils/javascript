import { Component, Input, computed, forwardRef, signal } from "@angular/core";
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
@@fieldImports@@

@@mask@@

/** One id per field on the page, to tie each label to its own input. */
let fields = 0;

/** Masks a @@label@@ while it is typed. Validation belongs to the form. */
@Component({
  selector: "app-@@kind@@-field",
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => @@Name@@Field),
      multi: true,
    },
  ],
  template: `
    <label [for]="id">@@label@@</label>
    <input
      [id]="id"
      inputmode="@@inputMode@@"
      autocomplete="@@autocomplete@@"
      placeholder="@@placeholder@@"
      [value]="masked()"
      [disabled]="disabled()"
      [attr.aria-invalid]="invalid"
      [attr.aria-describedby]="describedBy"
      (input)="onInput($event)"
      (blur)="onTouched()"
    />
  `,
})
export class @@Name@@Field implements ControlValueAccessor {
  /** What the form says about the field, passed on to the input it wraps. */
  @Input("aria-invalid") invalid?: boolean;
  @Input("aria-describedby") describedBy?: string;

  protected readonly id = `@@kind@@-${(fields += 1)}`;

  /** The @@label@@ without its mask, the way the form holds it. */
  protected readonly value = signal("");
  protected readonly disabled = signal(false);
  protected readonly masked = computed(() => @@formatSignal@@);

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

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  protected onInput(event: Event) {
    const masked = mask({
      input: event.target as HTMLInputElement,
      inputType: (event as InputEvent).inputType,
      format: @@format@@,
    });
    const value = @@parseMaskedVar@@;

    this.value.set(value);
    this.onChange(value);
  }
}
