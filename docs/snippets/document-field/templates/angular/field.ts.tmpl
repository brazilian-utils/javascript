import {
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  forwardRef,
  signal,
} from "@angular/core";
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import { MaskDirective, type MaskChange } from "./mask.directive";

export type Mask = {
  /** Formats what is typed, as it is typed. */
  format: (value: string) => string;
  /** Takes the mask off, for whoever holds the value. */
  parse: (value: string) => string;
};

/** One id per field on the page, to tie each label and message to their own input. */
let fields = 0;

/** A labelled input that says what is wrong with it, masked when it is given a mask. */
@Component({
  selector: "app-field",
  imports: [MaskDirective],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Field), multi: true },
  ],
  template: `
    <label [for]="id">{{ label }}</label>
    <input
      [appMask]="format()"
      [parse]="parse()"
      [id]="id"
      [attr.inputmode]="inputMode"
      [attr.autocomplete]="autocomplete"
      [attr.placeholder]="placeholder"
      [value]="shown()"
      [disabled]="disabled()"
      [attr.aria-invalid]="Boolean(errorMessage)"
      [attr.aria-describedby]="errorId"
      (masked)="onMasked($event)"
      (blur)="onBlur()"
    />
    <!-- On the page from the start, and announced when it gets its text. -->
    <p [id]="errorId" role="alert">{{ errorMessage }}</p>
  `,
  // A component is an element of its own; this one stands aside so its label, input and message
  // are laid out by the form around it, one row of it each, the way they are written here.
  styles: `:host { display: contents; }`,
})
export class Field implements ControlValueAccessor {
  @Input({ required: true }) label = "";
  @Input() inputMode?: string;
  @Input() autocomplete?: string;
  @Input() placeholder?: string;
  @Input() errorMessage?: string;

  /** What the field shows, for whoever wraps it. */
  @Input() set value(value: string) {
    this.text.set(value ?? "");
  }

  /** What was typed, without its mask, for whoever wraps it. */
  @Output() readonly valueChange = new EventEmitter<string>();

  /** Left, for whoever wraps this field and answers to a form. */
  @Output() readonly touched = new EventEmitter<void>();

  /** How to mask the field, when it is a field that is masked. */
  @Input() set mask(mask: Mask | undefined) {
    this.masking.set(mask);
  }

  protected readonly Boolean = Boolean;
  protected readonly id = `field-${(fields += 1)}`;
  protected readonly errorId = `${this.id}-error`;

  private readonly masking = signal<Mask | undefined>(undefined);

  /** The value without its mask, the way a form holds it. */
  protected readonly text = signal("");
  protected readonly disabled = signal(false);
  protected readonly format = computed(
    () => this.masking()?.format ?? ((typed: string) => typed),
  );
  protected readonly parse = computed(
    () => this.masking()?.parse ?? ((typed: string) => typed),
  );
  protected readonly shown = computed(() => this.format()(this.text()));

  protected onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.text.set(value ?? "");
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

  protected onBlur() {
    this.onTouched();
    this.touched.emit();
  }

  protected onMasked({ parsedValue }: MaskChange) {
    this.text.set(parsedValue);
    this.onChange(parsedValue);
    this.valueChange.emit(parsedValue);
  }
}
