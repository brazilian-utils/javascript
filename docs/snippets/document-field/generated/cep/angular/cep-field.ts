import { Component, Input, computed, forwardRef, signal } from "@angular/core";
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import { formatCep, parseCep } from "@brazilian-utils/brazilian-utils";
import { MaskDirective } from "./mask.directive";

/** One id per field on the page, to tie each label and message to their own input. */
let fields = 0;

/** Masks a CEP while it is typed. Validation belongs to the form. */
@Component({
  selector: "app-cep-field",
  imports: [MaskDirective],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CepField),
      multi: true,
    },
  ],
  template: `
    <label [for]="id">CEP</label>
    <input
      [appMask]="format"
      [id]="id"
      inputmode="numeric"
      autocomplete="postal-code"
      placeholder="00000-000"
      [value]="masked()"
      [disabled]="disabled()"
      [attr.aria-invalid]="Boolean(errorMessage)"
      [attr.aria-describedby]="errorId"
      (input)="onInput($event)"
      (blur)="onTouched()"
    />
    <!-- On the page from the start, and announced when it gets its text. -->
    <p [id]="errorId" role="alert">{{ errorMessage }}</p>
  `,
})
export class CepField implements ControlValueAccessor {
  /** What the form says is wrong with the value, if anything. */
  @Input() errorMessage?: string;

  protected readonly id = `cep-${(fields += 1)}`;
  protected readonly errorId = `${this.id}-error`;
  protected readonly format = formatCep;
  protected readonly Boolean = Boolean;

  /** The CEP without its mask, the way the form holds it. */
  protected readonly value = signal("");
  protected readonly disabled = signal(false);
  protected readonly masked = computed(() => formatCep(this.value()));

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
    const value = parseCep((event.target as HTMLInputElement).value);

    this.value.set(value);
    this.onChange(value);
  }
}
