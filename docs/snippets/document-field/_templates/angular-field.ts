import { Component, Input, computed, forwardRef, signal } from "@angular/core";
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
@@fieldImports@@
import { MaskDirective, type MaskChange } from "./mask.directive";

/** One id per field on the page, to tie each label and message to their own input. */
let fields = 0;

/** Masks a @@label@@ while it is typed. Validation belongs to the form. */
@Component({
  selector: "app-@@kind@@-field",
  imports: [MaskDirective],
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
      [appMask]="format"
      [parse]="parse"
      [id]="id"
      inputmode="@@inputMode@@"
      autocomplete="@@autocomplete@@"
      placeholder="@@placeholder@@"
      [value]="masked()"
      [disabled]="disabled()"
      [attr.aria-invalid]="Boolean(errorMessage)"
      [attr.aria-describedby]="errorId"
      (masked)="onMasked($event)"
      (blur)="onTouched()"
    />
    <!-- On the page from the start, and announced when it gets its text. -->
    <p [id]="errorId" role="alert">{{ errorMessage }}</p>
  `,
})
export class @@Name@@Field implements ControlValueAccessor {
  /** What the form says is wrong with the value, if anything. */
  @Input() errorMessage?: string;

  protected readonly id = `@@kind@@-${(fields += 1)}`;
  protected readonly errorId = `${this.id}-error`;
  protected readonly format = @@format@@;
  protected readonly parse = @@parse@@;
  protected readonly Boolean = Boolean;

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

  protected onMasked({ parsedValue }: MaskChange) {
    this.value.set(parsedValue);
    this.onChange(parsedValue);
  }
}
