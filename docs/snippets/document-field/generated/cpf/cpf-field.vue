<script setup lang="ts">
import { computed, useId } from "vue";
import { formatCpf, parseCpf } from "@brazilian-utils/brazilian-utils";

type MaskParams = {
  /** The field the document is typed into. */
  input: HTMLInputElement;
  /** The `inputType` of the `input` event. */
  inputType?: string;
  /** The formatter of the document being typed. */
  format: (value: string) => string;
};

/**
 * Formats the document typed into `input` in place and keeps the caret next to
 * the character being edited, so typing, deleting or pasting anywhere works.
 * Returns the formatted value.
 */
function mask({ input, inputType = "", format }: MaskParams): string {
  let value = input.value;
  let caret = input.selectionStart ?? value.length;

  // A deleted separator would come straight back: delete the character next to it.
  if (inputType.startsWith("delete") && format(value).length > value.length) {
    if (inputType === "deleteContentBackward") caret -= 1;
    value = value.slice(0, caret) + value.slice(caret + 1);
  }

  // Formatting what comes before the caret says where the caret goes.
  const position = format(value.slice(0, caret)).length;

  input.value = format(value);
  input.setSelectionRange(position, position);

  return input.value;
}

// The attributes the form puts on this component belong on the input, not on the label.
defineOptions({ inheritAttrs: false });

/** The CPF without its mask, the way the form holds it. */
const value = defineModel<string>({ required: true });

const id = useId();
const masked = computed(() => formatCpf(value.value));

function onInput(event: Event) {
  const masked = mask({
    input: event.target as HTMLInputElement,
    inputType: (event as InputEvent).inputType,
    format: formatCpf,
  });

  value.value = parseCpf(masked);
}
</script>

<template>
  <!-- Masks a CPF while it is typed. Validation belongs to the form. -->
  <label :for="id">CPF</label>
  <input
    v-bind="$attrs"
    :id="id"
    inputmode="numeric"
    autocomplete="off"
    placeholder="000.000.000-00"
    :value="masked"
    @input="onInput"
  />
</template>
