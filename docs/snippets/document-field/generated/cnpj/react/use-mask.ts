import { useEffect, useRef } from "react";

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
 * React remembers the value it last saw on an input to decide whether it changed. Writing through
 * the DOM's own setter leaves that memory alone, so React still reports the change.
 */
const write = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

/**
 * Masks what is typed with `format`, in place. Returns the ref to put on the input: nothing else
 * to wire, and the input's `change` carries the formatted value.
 */
export function useMask(format: (value: string) => string) {
  const ref = useRef<HTMLInputElement>(null);
  const formatter = useRef(format);

  formatter.current = format;

  useEffect(() => {
    const input = ref.current;

    if (!input) return;

    const onInput = (event: Event) => {
      const masked = mask({
        value: input.value,
        caret: input.selectionStart ?? input.value.length,
        inputType: (event as InputEvent).inputType,
        format: formatter.current,
      });

      write?.call(input, masked.value);
      input.setSelectionRange(masked.caret, masked.caret);
    };

    input.addEventListener("input", onInput);

    return () => input.removeEventListener("input", onInput);
  }, []);

  return ref;
}
