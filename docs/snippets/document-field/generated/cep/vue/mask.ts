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
    });
  },
};
