import { useEffect, useRef } from "react";

@@mask@@

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
