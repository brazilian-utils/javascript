import type { Directive } from "vue";

@@mask@@

/**
 * Masks what is typed into an input with the formatter it is given, in place: `v-mask="formatCpf"`.
 * The input stays yours, and its `input` event carries the formatted value.
 */
export const vMask: Directive<HTMLInputElement, (value: string) => string> = {
  mounted(input, binding) {
    input.addEventListener("input", (event) =>
      mask({ input, inputType: (event as InputEvent).inputType, format: binding.value }),
    );
  },
};
