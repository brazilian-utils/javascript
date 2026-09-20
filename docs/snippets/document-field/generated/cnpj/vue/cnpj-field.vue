<script setup lang="ts">
import { computed, useId } from "vue";
import { formatCnpj, parseCnpj } from "@brazilian-utils/brazilian-utils";
import { vMask } from "./mask";

// The attributes the form puts on this component belong on the input, not on the label.
defineOptions({ inheritAttrs: false });

/** What the form says is wrong with the value, if anything. */
const { errorMessage } = defineProps<{ errorMessage?: string }>();

/** The CNPJ without its mask, the way the form holds it. */
const value = defineModel<string>({ required: true });

const format = (value: string) => formatCnpj(value, { version: 2 });
const id = useId();
const errorId = `${id}-error`;
const masked = computed(() => formatCnpj(value.value, { version: 2 }));

function onInput(event: Event) {
  value.value = parseCnpj((event.target as HTMLInputElement).value, { version: 2 });
}
</script>

<template>
  <!-- Masks a CNPJ while it is typed. Validation belongs to the form. -->
  <label :for="id">CNPJ</label>
  <input
    v-bind="$attrs"
    v-mask="format"
    :id="id"
    inputmode="text"
    autocomplete="off"
    placeholder="00.ABC.000/0001-00"
    :value="masked"
    :aria-invalid="Boolean(errorMessage)"
    :aria-describedby="errorId"
    @input="onInput"
  />
  <!-- On the page from the start, and announced when it gets its text. -->
  <p :id="errorId" role="alert">{{ errorMessage }}</p>
</template>
