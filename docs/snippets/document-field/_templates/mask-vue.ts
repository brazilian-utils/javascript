import type { Directive } from "vue";

/**
 * Masks what is typed with the formatter it is given, in place: `v-mask="formatCpf"`. The input's
 * `input` event carries the formatted value.
 */
export const vMask: Directive<HTMLInputElement, (value: string) => string> = {
  mounted(input, binding) {
    input.addEventListener("input", (event) => {
      const format = binding.value;
      const inputType = (event as InputEvent).inputType ?? "";

      @@maskBody@@
    });
  },
};
