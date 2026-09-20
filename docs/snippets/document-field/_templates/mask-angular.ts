import { Directive, ElementRef, Input, inject } from "@angular/core";

@@mask@@

/**
 * Masks what is typed into an input with the formatter it is given, in place:
 * `<input [appMask]="formatCpf" />`. The input stays yours, and its `input` event carries the
 * formatted value.
 */
@Directive({
  selector: "[appMask]",
  host: { "(input)": "onInput($event)" },
})
export class MaskDirective {
  @Input({ required: true, alias: "appMask" }) format!: (value: string) => string;

  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef);

  protected onInput(event: InputEvent) {
    const input = this.input.nativeElement;
    const masked = mask({
      value: input.value,
      caret: input.selectionStart ?? input.value.length,
      inputType: event.inputType,
      format: this.format,
    });

    input.value = masked.value;
    input.setSelectionRange(masked.caret, masked.caret);
  }
}
