import type { Directive } from "vue";

type MaskOptions = {
  /** The formatter of the document being typed. */
  format: (value: string) => string;
  /** The parser of the same document, which takes the mask off. */
  parse: (value: string) => string;
  /** Called on every change, with the value masked and without its mask. */
  onChange?: (change: { maskedValue: string; parsedValue: string }) => void;
};

/**
 * Masks what is typed into an input, in place, and reports every change masked and without its
 * mask, so a form can hold either one: `v-mask="{ format, parse, onChange }"`.
 */
export const vMask: Directive<HTMLInputElement, MaskOptions> = {
  mounted(input, binding) {
    input.addEventListener("input", (event) => {
      const { format, parse, onChange } = binding.value;
      const inputType = (event as InputEvent).inputType ?? "";

      @@maskBody@@

      onChange?.({ maskedValue: input.value, parsedValue: parse(input.value) });
    });
  },
};
