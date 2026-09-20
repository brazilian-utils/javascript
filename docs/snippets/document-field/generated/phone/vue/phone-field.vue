<script setup lang="ts">
import { computed, useId } from "vue";
import { formatPhone, parsePhone } from "@brazilian-utils/brazilian-utils";
import { vMask } from "./mask";

// The attributes the form puts on this component belong on the input, not on the label.
defineOptions({ inheritAttrs: false });

/** What the form says is wrong with the value, if anything. */
const { errorMessage } = defineProps<{ errorMessage?: string }>();

/** The Phone without its mask, the way the form holds it. */
const value = defineModel<string>({ required: true });

const format = (value: string) => formatPhone(value, { mask: "nanp" });
const id = useId();
const errorId = `${id}-error`;
const masked = computed(() => formatPhone(value.value, { mask: "nanp" }));

function onInput(event: Event) {
  value.value = parsePhone((event.target as HTMLInputElement).value);
}
</script>

<template>
  <!-- Masks a Phone while it is typed. Validation belongs to the form. -->
  <label :for="id">Phone</label>
  <input
    v-bind="$attrs"
    v-mask="format"
    :id="id"
    inputmode="numeric"
    autocomplete="tel-national"
    placeholder="(00) 00000-0000"
    :value="masked"
    :aria-invalid="Boolean(errorMessage)"
    :aria-describedby="errorId"
    @input="onInput"
  />
  <!-- On the page from the start, and announced when it gets its text. -->
  <p :id="errorId" role="alert">{{ errorMessage }}</p>
</template>
