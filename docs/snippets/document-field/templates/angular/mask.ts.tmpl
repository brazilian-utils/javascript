import { Directive, ElementRef, EventEmitter, Input, Output, inject } from "@angular/core";

export type MaskChange = {
  /** What the field shows. */
  maskedValue: string;
  /** The same value without its mask, for a form to hold. */
  parsedValue: string;
};

/**
 * Masks what is typed into an input, in place, and reports every change masked and without its
 * mask, so a form can hold either one:
 * `<input [appMask]="format" [parse]="parse" (masked)="onMasked($event)" />`.
 */
@Directive({
  selector: "[appMask]",
  host: { "(input)": "onInput($event)" },
})
export class MaskDirective {
  /** The formatter of the document being typed. */
  @Input({ required: true, alias: "appMask" }) format!: (value: string) => string;

  /** The parser of the same document, which takes the mask off. */
  @Input({ required: true }) parse!: (value: string) => string;

  @Output() readonly masked = new EventEmitter<MaskChange>();

  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef);

  protected onInput(event: InputEvent) {
    const input = this.element.nativeElement;
    const inputType = event.inputType ?? "";
    const format = this.format;

    @@maskBody@@

    this.masked.emit({ maskedValue: input.value, parsedValue: this.parse(input.value) });
  }
}
