<script setup lang="ts">
import { reactive, ref, useId, watch } from "vue";
import { formatCep, isValidCep } from "@brazilian-utils/brazilian-utils";
import { useAddressLookup } from "./use-address-lookup";

const EMPTY = { street: "", neighborhood: "", city: "", state: "" };
const STATUS = {
  idle: "",
  loading: "Looking it up…",
  found: "",
  failed: "No address for this CEP",
};

const id = useId();
const cep = ref("");
const address = reactive({ ...EMPTY });
const { lookup, lookupCep, reset } = useAddressLookup();

// What the lookup found is what the form starts from; it stays editable from there.
watch(lookup, (current) => {
  if (current.status === "found") Object.assign(address, current.address);
  if (current.status === "failed") Object.assign(address, EMPTY);
});

function onCepChange(event: Event) {
  cep.value = formatCep((event.target as HTMLInputElement).value);

  // Asking before the CEP is complete is asking for nothing.
  if (isValidCep(cep.value)) lookupCep(cep.value);
  else reset();
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
      :aria-busy="lookup.status === 'loading'"
      @input="onCepChange"
    />
    <!-- On the page from the start, and announced when it gets its text. -->
    <output :id="`${id}-status`">{{ STATUS[lookup.status] }}</output>

    <label :for="`${id}-street`">Street</label>
    <input :id="`${id}-street`" v-model="address.street" autocomplete="address-line1" />

    <label :for="`${id}-neighborhood`">Neighborhood</label>
    <input :id="`${id}-neighborhood`" v-model="address.neighborhood" />

    <label :for="`${id}-city`">City</label>
    <input :id="`${id}-city`" v-model="address.city" autocomplete="address-level2" />

    <label :for="`${id}-state`">State</label>
    <input :id="`${id}-state`" v-model="address.state" autocomplete="address-level1" />
  </form>
</template>
