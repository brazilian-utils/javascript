<script lang="ts">
import {
  formatCep,
  formatCnpj,
  formatCpf,
  formatPhone,
  isValidCep,
  isValidCnpj,
  isValidCpf,
  isValidPhone,
} from "@brazilian-utils/brazilian-utils";

export type DocumentKind = "cpf" | "cnpj" | "cep" | "phone";

export type DocumentSpec = {
  label: string;
  /** The complete format, which also tells the field when the value is complete. */
  placeholder: string;
  format: (value: string) => string;
  validator: (value: string) => boolean;
};

export const DOCUMENTS: Record<DocumentKind, DocumentSpec> = {
  cpf: {
    label: "CPF",
    placeholder: "000.000.000-00",
    format: formatCpf,
    validator: isValidCpf,
  },
  cnpj: {
    label: "CNPJ",
    placeholder: "00.ABC.000/0001-00",
    format: (value) => formatCnpj(value, { version: 2 }),
    validator: (value) => isValidCnpj(value, { version: 2 }),
  },
  cep: {
    label: "CEP",
    placeholder: "00000-000",
    format: formatCep,
    validator: isValidCep,
  },
  phone: {
    label: "Phone",
    placeholder: "(00) 00000-0000",
    format: (value) => formatPhone(value, { mask: "nanp" }),
    validator: isValidPhone,
  },
};

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
export function mask({ input, inputType = "", format }: MaskParams): string {
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
</script>

<script setup lang="ts">
import { computed } from "vue";

const { kind } = defineProps<{ kind: DocumentKind }>();
const value = defineModel<string>({ default: "" });

const spec = computed(() => DOCUMENTS[kind]);
const valid = computed(() => spec.value.validator(value.value));
const complete = computed(
  () => valid.value || value.value.length === spec.value.placeholder.length,
);

function onInput(event: Event) {
  value.value = mask({
    input: event.target as HTMLInputElement,
    inputType: (event as InputEvent).inputType,
    format: spec.value.format,
  });
}
</script>

<template>
  <label>
    {{ spec.label }}
    <input
      :inputmode="kind === 'cnpj' ? 'text' : 'numeric'"
      :placeholder="spec.placeholder"
      :value="value"
      :aria-invalid="complete && !valid"
      @input="onInput"
    />
    <output v-if="complete">{{ valid ? "✓ Valid" : "✗ Invalid" }}</output>
  </label>
</template>
