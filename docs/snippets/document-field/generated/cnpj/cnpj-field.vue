<script setup lang="ts">
import { computed, useId } from "vue";
import { formatCnpj, isValidCnpj } from "@brazilian-utils/brazilian-utils";

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

// The attributes the form library puts on this component belong on the input, not on the label.
defineOptions({ inheritAttrs: false });

const value = defineModel<string>();

const id = useId();
const messageId = `${id}-message`;

// The model has no default: an unset one is an empty field.
const text = computed(() => value.value ?? "");
const valid = computed(() => isValidCnpj(text.value, { version: 2 }));
const complete = computed(() => valid.value || text.value.length === 18);

function onInput(event: Event) {
  value.value = mask({
    input: event.target as HTMLInputElement,
    inputType: (event as InputEvent).inputType,
    format: (value) => formatCnpj(value, { version: 2 }),
  });
}
</script>

<template>
  <label :for="id">CNPJ</label>
  <input
    v-bind="$attrs"
    :id="id"
    inputmode="text"
    autocomplete="off"
    placeholder="00.ABC.000/0001-00"
    :value="text"
    :aria-invalid="complete && !valid"
    :aria-describedby="[$attrs['aria-describedby'], messageId].filter(Boolean).join(' ')"
    @input="onInput"
  />
  <!-- A live region is announced when its text changes, so it stays on the page, empty. -->
  <output :id="messageId" :for="id">
    {{ complete ? (valid ? "✓ Valid CNPJ" : "✗ Invalid CNPJ") : "" }}
  </output>
</template>
