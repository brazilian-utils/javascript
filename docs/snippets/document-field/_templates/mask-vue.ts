import type { Directive } from "vue";

@@mask@@

/**
 * Masks what is typed with the formatter it is given, in place: `v-mask="formatCpf"`. The input's
 * `input` event carries the formatted value.
 */
export const vMask: Directive<HTMLInputElement, (value: string) => string> = {
  mounted(input, binding) {
    input.addEventListener("input", (event) => {
      const masked = mask({
        value: input.value,
        caret: input.selectionStart ?? input.value.length,
        inputType: (event as InputEvent).inputType,
        format: binding.value,
      });

      input.value = masked.value;
      input.setSelectionRange(masked.caret, masked.caret);
    });
  },
};
