import { useCallback, type ChangeEvent } from "react";

/**
 * Masks what is typed with `format`, in place, and gives back the formatted value. Call it from
 * the input's `onChange`, whether the input is controlled by a form or left to itself.
 *
 * The mask runs inside React's own event on purpose. React writes a controlled input's value
 * again right after the event, from what it holds, so a mask that writes from a listener of its
 * own is undone; here the value is masked before React reads it, and it holds the masked one.
 */
export function useMask(format: (value: string) => string) {
  return useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const inputType = (event.nativeEvent as InputEvent).inputType ?? "";

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

      return input.value;
    },
    [format],
  );
}
