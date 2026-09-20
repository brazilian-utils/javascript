import { Directive, ElementRef, Input, inject } from "@angular/core";

type MaskParams = {
  /** What the field holds right now. */
  value: string;
  /** Where the caret is in it. */
  caret: number;
  /** The `inputType` of the `input` event. */
  inputType?: string;
  /** The formatter of the document being typed. */
  format: (value: string) => string;
};

/**
 * Formats what has been typed and says where the caret goes, so typing, deleting or pasting
 * anywhere in the field works. Writing the result back is the caller's job.
 */
export function mask({ value, caret, inputType = "", format }: MaskParams) {
  let typed = value;
  let position = caret;

  // A deleted separator would come straight back: delete the character next to it.
  if (inputType.startsWith("delete") && format(typed).length > typed.length) {
    if (inputType === "deleteContentBackward") position -= 1;
    typed = typed.slice(0, position) + typed.slice(position + 1);
  }

  // Formatting what comes before the caret says where the caret goes.
  return { value: format(typed), caret: format(typed.slice(0, position)).length };
}

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
