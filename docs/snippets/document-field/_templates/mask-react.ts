import { useEffect, useLayoutEffect, useRef } from "react";

type UseMaskParams = {
  /** The formatter of the document being typed. */
  format: (value: string) => string;
  /** What a form holds for the field, when a form holds it. */
  value?: string;
  /** Called with the formatted value on every change. */
  onChange?: (value: string) => void;
};

/**
 * Masks what is typed, in place. Returns the ref to put on the input, which is all it needs: the
 * input keeps its own value, the mask formats it and says so through `onChange`.
 *
 * The input is left to the DOM rather than controlled by React, the way the masking libraries do
 * it: React writes a controlled input's value again right after an event, which would undo the
 * mask. Hand the hook the value a form holds and it writes it in, masked, whenever it changes.
 */
export function useMask({ format, value, onChange }: UseMaskParams) {
  const ref = useRef<HTMLInputElement>(null);
  const latest = useRef({ format, onChange });

  latest.current = { format, onChange };

  useEffect(() => {
    const input = ref.current;

    if (!input) return;

    const onInput = (event: Event) => {
      const inputType = (event as InputEvent).inputType ?? "";
      const { format } = latest.current;

      @@maskBody@@

      latest.current.onChange?.(input.value);
    };

    input.addEventListener("input", onInput);

    return () => input.removeEventListener("input", onInput);
  }, []);

  // What the form holds is what the field shows, masked, whenever the two differ.
  useLayoutEffect(() => {
    const input = ref.current;

    if (!input || value === undefined) return;

    const masked = latest.current.format(value);

    if (masked !== input.value) input.value = masked;
  }, [value]);

  return ref;
}
