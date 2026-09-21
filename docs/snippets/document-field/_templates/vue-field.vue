<script setup lang="ts">
import { computed, useId } from "vue";
@@fieldImports@@
import { vMask } from "./mask";

// The attributes the form puts on this component belong on the input, not on the label.
defineOptions({ inheritAttrs: false });

/** What the form says is wrong with the value, if anything. */
const { errorMessage } = defineProps<{ errorMessage?: string }>();

/** The @@label@@ without its mask, the way the form holds it. */
const value = defineModel<string>({ required: true });

const format = @@format@@;
const parse = @@parse@@;
const id = useId();
const errorId = `${id}-error`;
const masked = computed(() => @@formatValueVue@@);

</script>

<template>
  <!-- Masks a @@label@@ while it is typed. Validation belongs to the form. -->
  <label :for="id">@@label@@</label>
  <input
    v-bind="$attrs"
    v-mask="{ format, parse, onChange: ({ parsedValue }) => (value = parsedValue) }"
    :id="id"
    inputmode="@@inputMode@@"
    autocomplete="@@autocomplete@@"
    placeholder="@@placeholder@@"
    :value="masked"
    :aria-invalid="Boolean(errorMessage)"
    :aria-describedby="errorId"
  />
  <!-- On the page from the start, and announced when it gets its text. -->
  <p :id="errorId" role="alert">{{ errorMessage }}</p>
</template>
