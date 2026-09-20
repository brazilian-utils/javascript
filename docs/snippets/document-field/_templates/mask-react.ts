import { useCallback, type ChangeEvent } from "react";

@@mask@@

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
