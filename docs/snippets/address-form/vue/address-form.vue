<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import CepField from "./cep-field.vue";
import Field from "./field.vue";
import { useGetAddressByCep } from "./use-get-address-by-cep";

const EMPTY = { street: "", neighborhood: "", city: "", state: "" };
const STATUS = {
  idle: "",
  loading: "Looking it up…",
  found: "",
  failed: "No address for this CEP",
};

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

    <!-- The same field the document field guide builds, told what it is about. -->
    <Field v-model="address.street" label="Street" autocomplete="address-line1" />
    <Field v-model="address.neighborhood" label="Neighborhood" />
    <Field v-model="address.city" label="City" autocomplete="address-level2" />
    <Field v-model="address.state" label="State" autocomplete="address-level1" />
  </form>
</template>
