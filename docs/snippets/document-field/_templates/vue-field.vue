<script setup lang="ts">
import { computed, useId } from "vue";
@@fieldImports@@

@@maskLocal@@

// The attributes the form puts on this component belong on the input, not on the label.
defineOptions({ inheritAttrs: false });

/** The @@label@@ without its mask, the way the form holds it. */
const value = defineModel<string>({ required: true });

const id = useId();
const masked = computed(() => @@formatValueVue@@);

function onInput(event: Event) {
  const masked = mask({
    input: event.target as HTMLInputElement,
    inputType: (event as InputEvent).inputType,
    format: @@format@@,
  });

  value.value = @@parseMaskedVar@@;
}
</script>

<template>
  <!-- Masks a @@label@@ while it is typed. Validation belongs to the form. -->
  <label :for="id">@@label@@</label>
  <input
    v-bind="$attrs"
    :id="id"
    inputmode="@@inputMode@@"
    autocomplete="@@autocomplete@@"
    placeholder="@@placeholder@@"
    :value="masked"
    @input="onInput"
  />
</template>
