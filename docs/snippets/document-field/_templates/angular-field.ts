import { Component, Input, computed, forwardRef, signal } from "@angular/core";
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
@@imports@@

@@mask@@

/** One id per field on the page, to tie each label and message to their own field. */
let fields = 0;

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
      [value]="value()"
      [disabled]="disabled()"
      [attr.aria-invalid]="complete() && !valid()"
      [attr.aria-describedby]="describedBy()"
      (input)="onInput($event)"
      (blur)="onTouched()"
    />
    <!-- A live region is announced when its text changes, so it stays on the page, empty. -->
    <output [id]="messageId" [htmlFor]="id">
      {{ complete() ? (valid() ? "✓ Valid @@label@@" : "✗ Invalid @@label@@") : "" }}
    </output>
  `,
})
export class @@Name@@Field implements ControlValueAccessor {
  /** What else describes this field, the form's own error message for example. */
  @Input("aria-describedby") describes?: string;

  protected readonly id = `@@kind@@-${(fields += 1)}`;
  protected readonly messageId = `${this.id}-message`;
  protected readonly value = signal("");
  protected readonly disabled = signal(false);
  protected readonly valid = computed(() => @@validatorSignal@@);
  protected readonly complete = computed(
    () => this.valid() || this.value().length === @@length@@,
  );

  // The message describes the field, next to whatever the form has to say about it.
  protected describedBy(): string {
    return [this.describes, this.messageId].filter(Boolean).join(" ");
  }

  protected onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ? @@formatCall@@ : "");
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
    const value = mask({
      input: event.target as HTMLInputElement,
      inputType: (event as InputEvent).inputType,
      format: @@format@@,
    });

    this.value.set(value);
    this.onChange(value);
  }
}
