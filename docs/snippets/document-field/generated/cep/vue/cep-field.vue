<script setup lang="ts">
import { computed, useId } from "vue";
import { formatCep, parseCep } from "@brazilian-utils/brazilian-utils";
import { vMask } from "./mask";

// The attributes the form puts on this component belong on the input, not on the label.
defineOptions({ inheritAttrs: false });

/** What the form says is wrong with the value, if anything. */
const { errorMessage } = defineProps<{ errorMessage?: string }>();

/** The CEP without its mask, the way the form holds it. */
const value = defineModel<string>({ required: true });

const format = formatCep;
const id = useId();
const errorId = `${id}-error`;
const masked = computed(() => formatCep(value.value));

function onInput(event: Event) {
  value.value = parseCep((event.target as HTMLInputElement).value);
}
</script>

<template>
  <!-- Masks a CEP while it is typed. Validation belongs to the form. -->
  <label :for="id">CEP</label>
  <input
    v-bind="$attrs"
    v-mask="format"
    :id="id"
    inputmode="numeric"
    autocomplete="postal-code"
    placeholder="00000-000"
    :value="masked"
    :aria-invalid="Boolean(errorMessage)"
    :aria-describedby="errorId"
    @input="onInput"
  />
  <!-- On the page from the start, and announced when it gets its text. -->
  <p :id="errorId" role="alert">{{ errorMessage }}</p>
</template>
