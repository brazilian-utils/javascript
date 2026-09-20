import { Component, Input, computed, forwardRef, signal } from "@angular/core";
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import { formatCpf, isValidCpf } from "@brazilian-utils/brazilian-utils";

type MaskParams = {
  /** The field the document is typed into. */
  input: HTMLInputElement;
  /** The `inputType` of the `input` event. */
  inputType?: string;
  /** The formatter of the document being typed. */
  format: (value: string) => string;
};

/**
 * Formats the document typed into `input` in place and keeps the caret next to
 * the character being edited, so typing, deleting or pasting anywhere works.
 * Returns the formatted value.
 */
export function mask({ input, inputType = "", format }: MaskParams): string {
  let value = input.value;
  let caret = input.selectionStart ?? value.length;

  // A deleted separator would come straight back: delete the character next to it.
  if (inputType.startsWith("delete") && format(value).length > value.length) {
    if (inputType === "deleteContentBackward") caret -= 1;
    value = value.slice(0, caret) + value.slice(caret + 1);
  }

  // Formatting what comes before the caret says where the caret goes.
  const position = format(value.slice(0, caret)).length;

  input.value = format(value);
  input.setSelectionRange(position, position);

  return input.value;
}

/** One id per field on the page, to tie each label and message to their own field. */
let fields = 0;

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
    <label [for]="id">CPF</label>
    <input
      [id]="id"
      inputmode="numeric"
      autocomplete="off"
      placeholder="000.000.000-00"
      [value]="value()"
      [disabled]="disabled()"
      [attr.aria-invalid]="complete() && !valid()"
      [attr.aria-describedby]="describedBy()"
      (input)="onInput($event)"
      (blur)="onTouched()"
    />
    <!-- A live region is announced when its text changes, so it stays on the page, empty. -->
    <output [id]="messageId" [htmlFor]="id">
      {{ complete() ? (valid() ? "✓ Valid CPF" : "✗ Invalid CPF") : "" }}
    </output>
  `,
})
export class CpfField implements ControlValueAccessor {
  /** What else describes this field, the form's own error message for example. */
  @Input("aria-describedby") describes?: string;

  protected readonly id = `cpf-${(fields += 1)}`;
  protected readonly messageId = `${this.id}-message`;
  protected readonly value = signal("");
  protected readonly disabled = signal(false);
  protected readonly valid = computed(() => isValidCpf(this.value()));
  protected readonly complete = computed(
    () => this.valid() || this.value().length === 14,
  );

  // The message describes the field, next to whatever the form has to say about it.
  protected describedBy(): string {
    return [this.describes, this.messageId].filter(Boolean).join(" ");
  }

  protected onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ? formatCpf(value) : "");
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
      format: formatCpf,
    });

    this.value.set(value);
    this.onChange(value);
  }
}
