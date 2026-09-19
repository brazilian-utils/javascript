<script setup lang="ts">
import { computed } from "vue";
import { formatCpf, isValidCpf } from "@brazilian-utils/brazilian-utils";

// The formatted CPF, bound with v-model.
const cpf = defineModel<string>({ default: "" });
const complete = computed(() => cpf.value.length === 14);
const valid = computed(() => complete.value && isValidCpf(cpf.value));

type MaskCpfParams = {
  /** The field the CPF is typed into. */
  input: HTMLInputElement;
  /** The `inputType` of the `input` event. */
  inputType?: string;
};

/**
 * Formats the CPF typed into `input` in place and keeps the caret next to
 * the digit being edited, so typing, deleting or pasting anywhere works.
 * Returns the formatted value.
 */
function maskCpf({ input, inputType = "" }: MaskCpfParams): string {
  let value = input.value;
  let caret = input.selectionStart ?? value.length;

  // A deleted "." or "-" would come straight back: delete the digit next to it.
  if (
    inputType.startsWith("delete") &&
    formatCpf(value).length > value.length
  ) {
    if (inputType === "deleteContentBackward") caret -= 1;
    value = value.slice(0, caret) + value.slice(caret + 1);
  }

  const digitsBeforeCaret = value.slice(0, caret).replace(/\D/g, "").length;
  const formatted = formatCpf(value);
  let position = 0;

  for (
    let seen = 0;
    seen < digitsBeforeCaret && position < formatted.length;
    position += 1
  ) {
    if (/\d/.test(formatted.charAt(position))) seen += 1;
  }

  input.value = formatted;
  input.setSelectionRange(position, position);

  return formatted;
}

function onInput(event: Event) {
  cpf.value = maskCpf({
    input: event.target as HTMLInputElement,
    inputType: (event as InputEvent).inputType,
  });
}
</script>

<template>
  <label>
    CPF
    <input
      inputmode="numeric"
      placeholder="000.000.000-00"
      :value="cpf"
      :aria-invalid="complete && !valid"
      @input="onInput"
    />
    <output v-if="complete">{{
      valid ? "✓ Valid CPF" : "✗ Invalid CPF"
    }}</output>
  </label>
</template>
