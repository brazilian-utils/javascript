<script setup lang="ts">
import { reactive, ref, useId } from "vue";
import {
  formatCep,
  getAddressInfoByCep,
  isValidCep,
} from "@brazilian-utils/brazilian-utils";

const EMPTY = { street: "", neighborhood: "", city: "", state: "" };

const id = useId();
const cep = ref("");
const status = ref("");
const address = reactive({ ...EMPTY });

async function onCepChange(event: Event) {
  cep.value = formatCep((event.target as HTMLInputElement).value);

  // The lookup is worth a request only once the CEP is complete.
  if (!isValidCep(cep.value)) {
    status.value = "";
    return;
  }

  status.value = "Looking up…";

  try {
    Object.assign(address, await getAddressInfoByCep(cep.value));
    status.value = "";
  } catch {
    Object.assign(address, EMPTY);
    status.value = "No address for this CEP";
  }
}
</script>

<template>
  <form @submit.prevent>
    <label :for="id">CEP</label>
    <input
      :id="id"
      inputmode="numeric"
      autocomplete="postal-code"
      placeholder="00000-000"
      :value="cep"
      :aria-describedby="`${id}-status`"
      @input="onCepChange"
    />
    <!-- On the page from the start, and announced when it gets its text. -->
    <output :id="`${id}-status`">{{ status }}</output>

    <label :for="`${id}-street`">Street</label>
    <input :id="`${id}-street`" v-model="address.street" autocomplete="address-line1" />

    <label :for="`${id}-neighborhood`">Neighborhood</label>
    <input :id="`${id}-neighborhood`" v-model="address.neighborhood" />

    <label :for="`${id}-city`">City</label>
    <input :id="`${id}-city`" v-model="address.city" autocomplete="address-level2" />

    <label :for="`${id}-state`">State</label>
    <input
      :id="`${id}-state`"
      v-model="address.state"
      autocomplete="address-level1"
      maxlength="2"
    />
  </form>
</template>
