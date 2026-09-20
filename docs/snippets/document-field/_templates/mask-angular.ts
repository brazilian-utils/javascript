import { Directive, ElementRef, Input, inject } from "@angular/core";

/**
 * Masks what is typed with the formatter it is given, in place:
 * `<input [appMask]="formatCpf" />`. The input's `input` event carries the formatted value.
 */
@Directive({
  selector: "[appMask]",
  host: { "(input)": "onInput($event)" },
})
export class MaskDirective {
  @Input({ required: true, alias: "appMask" }) format!: (value: string) => string;

  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef);

  protected onInput(event: InputEvent) {
    const input = this.element.nativeElement;
    const inputType = event.inputType ?? "";
    const format = this.format;

    @@maskBody@@
  }
}
