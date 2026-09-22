<script setup lang="ts">
import { computed, useId } from "vue";
import { vMask } from "./mask";

type Mask = {
  /** Formats what is typed, as it is typed. */
  format: (value: string) => string;
  /** Takes the mask off, for whoever holds the value. */
  parse: (value: string) => string;
};

/** The attributes the form puts on this component belong on the input, not on the label. */
defineOptions({ inheritAttrs: false });

const { label, errorMessage, mask } = defineProps<{
  label: string;
  /** What the form says is wrong with the value, if anything. */
  errorMessage?: string;
  /** How to mask the field, when it is a field that is masked. */
  mask?: Mask;
}>();

/** The value without its mask, the way a form holds it. */
const value = defineModel<string>({ required: true });

const id = useId();
const errorId = `${id}-error`;
const shown = computed(() => (mask ? mask.format(value.value) : value.value));
const options = computed(() => ({
  format: mask?.format ?? ((typed: string) => typed),
  parse: mask?.parse ?? ((typed: string) => typed),
  onChange: ({ parsedValue }: { parsedValue: string }) => (value.value = parsedValue),
}));
</script>

<template>
  <!-- A labelled input that says what is wrong with it, masked when it is given a mask. -->
  <label :for="id">{{ label }}</label>
  <input
    v-bind="$attrs"
    v-mask="options"
    :id="id"
    :value="shown"
    :aria-invalid="Boolean(errorMessage)"
    :aria-describedby="errorId"
  />
  <!-- On the page from the start, and announced when it gets its text. -->
  <p :id="errorId" role="alert">{{ errorMessage }}</p>
</template>
