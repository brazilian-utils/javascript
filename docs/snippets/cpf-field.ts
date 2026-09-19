import { Component, computed, model } from "@angular/core";
import type { FormValueControl } from "@angular/forms/signals";
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
  template: `
    <label>
      CPF
      <input
        inputmode="numeric"
        placeholder="000.000.000-00"
        [value]="value()"
        [attr.aria-invalid]="complete() && !valid()"
        (input)="onInput($event)"
      />
      @if (complete()) {
        <output>{{ valid() ? "✓ Valid CPF" : "✗ Invalid CPF" }}</output>
      }
    </label>
  `,
})
export class CpfField implements FormValueControl<string> {
  /** The formatted CPF: bind it with [formField] (Signal Forms) or [(value)]. */
  readonly value = model("");
  protected readonly complete = computed(() => this.value().length === 14);
  protected readonly valid = computed(
    () => this.complete() && isValidCpf(this.value()),
  );

  protected onInput(event: Event) {
    this.value.set(
      maskCpf({
        input: event.target as HTMLInputElement,
        inputType: (event as InputEvent).inputType,
      }),
    );
  }
}
