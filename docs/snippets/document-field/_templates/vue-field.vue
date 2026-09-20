<script setup lang="ts">
import { computed } from "vue";
@@imports@@

@@maskLocal@@

const value = defineModel<string>({ default: "" });

const valid = computed(() => @@validatorValue@@);
const complete = computed(() => valid.value || value.value.length === @@length@@);

function onInput(event: Event) {
  value.value = mask({
    input: event.target as HTMLInputElement,
    inputType: (event as InputEvent).inputType,
    format: @@format@@,
  });
}
</script>

<template>
  <label>
    @@label@@
    <input
      inputmode="@@inputMode@@"
      placeholder="@@placeholder@@"
      :value="value"
      :aria-invalid="complete && !valid"
      @input="onInput"
    />
    <output v-if="complete">{{ valid ? "✓ Valid @@label@@" : "✗ Invalid @@label@@" }}</output>
  </label>
</template>
