<script setup lang="ts">
import { computed, useId } from "vue";
@@imports@@

@@maskLocal@@

// The attributes the form library puts on this component belong on the input, not on the label.
defineOptions({ inheritAttrs: false });

const value = defineModel<string>();

const id = useId();
const messageId = `${id}-message`;

// The model has no default: an unset one is an empty field.
const text = computed(() => value.value ?? "");
const valid = computed(() => @@validatorText@@);
const complete = computed(() => valid.value || text.value.length === @@length@@);

function onInput(event: Event) {
  value.value = mask({
    input: event.target as HTMLInputElement,
    inputType: (event as InputEvent).inputType,
    format: @@format@@,
  });
}
</script>

<template>
  <label :for="id">@@label@@</label>
  <input
    v-bind="$attrs"
    :id="id"
    inputmode="@@inputMode@@"
    autocomplete="@@autocomplete@@"
    placeholder="@@placeholder@@"
    :value="text"
    :aria-invalid="complete && !valid"
    :aria-describedby="[$attrs['aria-describedby'], messageId].filter(Boolean).join(' ')"
    @input="onInput"
  />
  <!-- A live region is announced when its text changes, so it stays on the page, empty. -->
  <output :id="messageId" :for="id">
    {{ complete ? (valid ? "✓ Valid @@label@@" : "✗ Invalid @@label@@") : "" }}
  </output>
</template>
