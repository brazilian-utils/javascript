import { Component, Input, computed, forwardRef, signal } from "@angular/core";
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import { formatCnpj, parseCnpj } from "@brazilian-utils/brazilian-utils";
import { MaskDirective } from "./mask.directive";

/** One id per field on the page, to tie each label and message to their own input. */
let fields = 0;

/** Masks a CNPJ while it is typed. Validation belongs to the form. */
@Component({
  selector: "app-cnpj-field",
  imports: [MaskDirective],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CnpjField),
      multi: true,
    },
  ],
  template: `
    <label [for]="id">CNPJ</label>
    <input
      [appMask]="format"
      [id]="id"
      inputmode="text"
      autocomplete="off"
      placeholder="00.ABC.000/0001-00"
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
export class CnpjField implements ControlValueAccessor {
  /** What the form says is wrong with the value, if anything. */
  @Input() errorMessage?: string;

  protected readonly id = `cnpj-${(fields += 1)}`;
  protected readonly errorId = `${this.id}-error`;
  protected readonly format = (value: string) => formatCnpj(value, { version: 2 });
  protected readonly Boolean = Boolean;

  /** The CNPJ without its mask, the way the form holds it. */
  protected readonly value = signal("");
  protected readonly disabled = signal(false);
  protected readonly masked = computed(() => formatCnpj(this.value(), { version: 2 }));

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
    const value = parseCnpj((event.target as HTMLInputElement).value, { version: 2 });

    this.value.set(value);
    this.onChange(value);
  }
}
