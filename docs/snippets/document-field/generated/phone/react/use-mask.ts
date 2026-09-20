import { useCallback, type ChangeEvent } from "react";

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
 * Masks what is typed with `format`, in place, and gives back the formatted value. Call it from
 * the input's `onChange`, whether the input is controlled by a form or left to itself.
 *
 * The mask runs inside React's own event on purpose. React writes a controlled input's value
 * again right after the event, from what it holds, so a mask that writes from a listener of its
 * own is undone; masking here happens before React reads the value, and it holds the masked one.
 */
export function useMask(format: (value: string) => string) {
  return useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const masked = mask({
        value: input.value,
        caret: input.selectionStart ?? input.value.length,
        inputType: (event.nativeEvent as InputEvent).inputType,
        format,
      });

      input.value = masked.value;
      input.setSelectionRange(masked.caret, masked.caret);

      return masked.value;
    },
    [format],
  );
}
