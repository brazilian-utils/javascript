<script setup lang="ts">
import { computed, useId } from "vue";
import { formatCpf, isValidCpf } from "@brazilian-utils/brazilian-utils";

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

const value = defineModel<string>({ default: "" });

// The message is tied to the field, so a screen reader reads it with the field.
const messageId = useId();

const valid = computed(() => isValidCpf(value.value));
const complete = computed(() => valid.value || value.value.length === 14);

function onInput(event: Event) {
  value.value = mask({
    input: event.target as HTMLInputElement,
    inputType: (event as InputEvent).inputType,
    format: formatCpf,
  });
}
</script>

<template>
  <label>
    CPF
    <input
      inputmode="numeric"
      autocomplete="off"
      placeholder="000.000.000-00"
      :value="value"
      :aria-invalid="complete && !valid"
      :aria-describedby="complete ? messageId : undefined"
      @input="onInput"
    />
    <output v-if="complete" :id="messageId">
      {{ valid ? "✓ Valid CPF" : "✗ Invalid CPF" }}
    </output>
  </label>
</template>
