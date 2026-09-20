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

    let typed = input.value;
    let position = input.selectionStart ?? typed.length;

    // A deleted separator would come straight back: delete the character next to it.
    if (inputType.startsWith("delete") && format(typed).length > typed.length) {
      if (inputType === "deleteContentBackward") position -= 1;
      typed = typed.slice(0, position) + typed.slice(position + 1);
    }

    // Formatting what comes before the caret says where the caret goes.
    const caret = format(typed.slice(0, position)).length;

    input.value = format(typed);
    input.setSelectionRange(caret, caret);
  }
}
