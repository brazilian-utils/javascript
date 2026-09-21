<script setup lang="ts">
import { reactive, ref, useId, watch } from "vue";
import CepField from "./cep-field.vue";
import { useGetAddressByCep } from "./use-get-address-by-cep";

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
const lookup = useGetAddressByCep(cep);

// What the lookup found is what the form starts from; it stays editable from there.
watch(lookup, (current) => {
  if (current.status === "found") Object.assign(address, current.address);
  if (current.status === "failed") Object.assign(address, EMPTY);
});
</script>

<template>
  <form @submit.prevent>
    <CepField v-model="cep" :error-message="STATUS[lookup.status]" />

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
