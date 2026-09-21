<script setup lang="ts">
import { ref, useId } from "vue";
import { getStates } from "@brazilian-utils/brazilian-utils/get-states";
import type { StateCode } from "@brazilian-utils/brazilian-utils";

// The states are a short list and come with the page; the cities are 5,571 of them, so that table
// is fetched only when a state is picked, and only once.
const states = getStates();

const id = useId();
const cities = ref<string[]>([]);
const loading = ref(false);

async function onStateChange(event: Event) {
  const state = (event.target as HTMLSelectElement).value;

  cities.value = [];

  if (!state) return;

  loading.value = true;

  const { getCities } = await import("@brazilian-utils/brazilian-utils/get-cities");

  cities.value = getCities(state as StateCode);
  loading.value = false;
}
</script>

<template>
  <label :for="id">State</label>
  <select :id="id" @change="onStateChange">
    <option value="">Pick a state</option>
    <option v-for="state in states" :key="state.code" :value="state.code">
      {{ state.name }}
    </option>
  </select>

  <label :for="`${id}-city`">City</label>
  <select :id="`${id}-city`" :disabled="cities.length === 0">
    <option value="">{{ loading ? "Loading the cities…" : "Pick a city" }}</option>
    <option v-for="city in cities" :key="city" :value="city">{{ city }}</option>
  </select>
</template>
