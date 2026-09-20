import { useCallback, type ChangeEvent } from "react";

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

/**
 * Masks what is typed into an input with `format`, in place. Returns the handler to call from the
 * input's `onChange`, which gives back the formatted value.
 *
 * The mask runs inside React's own event rather than in a listener of its own: React compares the
 * value it last saw on the input, so a value rewritten behind its back makes it drop the change.
 */
export function useMask(format: (value: string) => string) {
  return useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      mask({
        input: event.currentTarget,
        inputType: (event.nativeEvent as InputEvent).inputType,
        format,
      }),
    [format],
  );
}
