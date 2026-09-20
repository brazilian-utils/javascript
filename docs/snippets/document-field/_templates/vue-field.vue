<script setup lang="ts">
import { computed, useId } from "vue";
@@imports@@

@@maskLocal@@

const value = defineModel<string>({ default: "" });

// The message is tied to the field, so a screen reader reads it with the field.
const messageId = useId();

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
      autocomplete="@@autocomplete@@"
      placeholder="@@placeholder@@"
      :value="value"
      :aria-invalid="complete && !valid"
      :aria-describedby="complete ? messageId : undefined"
      @input="onInput"
    />
    <output v-if="complete" :id="messageId">
      {{ valid ? "✓ Valid @@label@@" : "✗ Invalid @@label@@" }}
    </output>
  </label>
</template>
