<script setup lang="ts">
import { computed, useId } from "vue";
import { formatCnpj, parseCnpj } from "@brazilian-utils/brazilian-utils";

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

/** The CNPJ without its mask, the way the form holds it. */
const value = defineModel<string>({ required: true });

const id = useId();
const masked = computed(() => formatCnpj(value.value, { version: 2 }));

function onInput(event: Event) {
  const masked = mask({
    input: event.target as HTMLInputElement,
    inputType: (event as InputEvent).inputType,
    format: (value) => formatCnpj(value, { version: 2 }),
  });

  value.value = parseCnpj(masked, { version: 2 });
}
</script>

<template>
  <!-- Masks a CNPJ while it is typed. Validation belongs to the form. -->
  <label :for="id">CNPJ</label>
  <input
    v-bind="$attrs"
    :id="id"
    inputmode="text"
    autocomplete="off"
    placeholder="00.ABC.000/0001-00"
    :value="masked"
    @input="onInput"
  />
</template>
