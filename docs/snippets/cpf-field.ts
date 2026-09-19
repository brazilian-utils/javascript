import { Component, computed, forwardRef, signal } from "@angular/core";
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import { formatCpf, isValidCpf } from "@brazilian-utils/brazilian-utils";

type MaskCpfParams = {
  /** The field the CPF is typed into. */
  input: HTMLInputElement;
  /** The `inputType` of the `input` event. */
  inputType?: string;
};

/**
 * Formats the CPF typed into `input` in place and keeps the caret next to
 * the digit being edited, so typing, deleting or pasting anywhere works.
 * Returns the formatted value.
 */
function maskCpf({ input, inputType = "" }: MaskCpfParams): string {
  let value = input.value;
  let caret = input.selectionStart ?? value.length;

  // A deleted "." or "-" would come straight back: delete the digit next to it.
  if (
    inputType.startsWith("delete") &&
    formatCpf(value).length > value.length
  ) {
    if (inputType === "deleteContentBackward") caret -= 1;
    value = value.slice(0, caret) + value.slice(caret + 1);
  }

  const digitsBeforeCaret = value.slice(0, caret).replace(/\D/g, "").length;
  const formatted = formatCpf(value);
  let position = 0;

  for (
    let seen = 0;
    seen < digitsBeforeCaret && position < formatted.length;
    position += 1
  ) {
    if (/\d/.test(formatted.charAt(position))) seen += 1;
  }

  input.value = formatted;
  input.setSelectionRange(position, position);

  return formatted;
}

@Component({
  selector: "app-cpf-field",
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CpfField),
      multi: true,
    },
  ],
  template: `
    <label>
      CPF
      <input
        inputmode="numeric"
        placeholder="000.000.000-00"
        [value]="value()"
        [disabled]="disabled()"
        [attr.aria-invalid]="complete() && !valid()"
        (input)="onInput($event)"
        (blur)="onTouched()"
      />
      @if (complete()) {
        <output>{{ valid() ? "✓ Valid CPF" : "✗ Invalid CPF" }}</output>
      }
    </label>
  `,
})
export class CpfField implements ControlValueAccessor {
  protected readonly value = signal("");
  protected readonly disabled = signal(false);
  protected readonly complete = computed(() => this.value().length === 14);
  protected readonly valid = computed(
    () => this.complete() && isValidCpf(this.value()),
  );

  protected onChange: (cpf: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(cpf: string | null): void {
    this.value.set(formatCpf(cpf ?? ""));
  }

  registerOnChange(onChange: (cpf: string) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  protected onInput(event: Event) {
    const cpf = maskCpf({
      input: event.target as HTMLInputElement,
      inputType: (event as InputEvent).inputType,
    });

    this.value.set(cpf);
    this.onChange(cpf);
  }
}
