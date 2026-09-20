<script setup lang="ts">
import { computed, useId } from "vue";
import { formatCpf, parseCpf } from "@brazilian-utils/brazilian-utils";
import { vMask } from "./mask";

// The attributes the form puts on this component belong on the input, not on the label.
defineOptions({ inheritAttrs: false });

/** What the form says is wrong with the value, if anything. */
const { errorMessage } = defineProps<{ errorMessage?: string }>();

/** The CPF without its mask, the way the form holds it. */
const value = defineModel<string>({ required: true });

const format = formatCpf;
const id = useId();
const errorId = `${id}-error`;
const masked = computed(() => formatCpf(value.value));

function onInput(event: Event) {
  value.value = parseCpf((event.target as HTMLInputElement).value);
}
</script>

<template>
  <!-- Masks a CPF while it is typed. Validation belongs to the form. -->
  <label :for="id">CPF</label>
  <input
    v-bind="$attrs"
    v-mask="format"
    :id="id"
    inputmode="numeric"
    autocomplete="off"
    placeholder="000.000.000-00"
    :value="masked"
    :aria-invalid="Boolean(errorMessage)"
    :aria-describedby="errorId"
    @input="onInput"
  />
  <!-- On the page from the start, and announced when it gets its text. -->
  <p :id="errorId" role="alert">{{ errorMessage }}</p>
</template>
