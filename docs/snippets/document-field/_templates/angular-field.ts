import { Component, computed, forwardRef, signal } from "@angular/core";
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
@@imports@@

@@mask@@

/** One id per field on the page, to tie each message to its own field. */
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
    <label>
      @@label@@
      <input
        inputmode="@@inputMode@@"
        autocomplete="@@autocomplete@@"
        placeholder="@@placeholder@@"
        [value]="value()"
        [disabled]="disabled()"
        [attr.aria-invalid]="complete() && !valid()"
        [attr.aria-describedby]="complete() ? messageId : null"
        (input)="onInput($event)"
        (blur)="onTouched()"
      />
      @if (complete()) {
        <output [id]="messageId">
          {{ valid() ? "✓ Valid @@label@@" : "✗ Invalid @@label@@" }}
        </output>
      }
    </label>
  `,
})
export class @@Name@@Field implements ControlValueAccessor {
  protected readonly messageId = `@@kind@@-message-${(fields += 1)}`;
  protected readonly value = signal("");
  protected readonly disabled = signal(false);
  protected readonly valid = computed(() => @@validatorSignal@@);
  protected readonly complete = computed(
    () => this.valid() || this.value().length === @@length@@,
  );

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
