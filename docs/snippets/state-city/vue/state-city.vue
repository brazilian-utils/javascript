<script setup lang="ts">
import { useId } from "vue";
import { getStates } from "@brazilian-utils/brazilian-utils/get-states";
import { useCities } from "./use-cities";

// The states are a short list, so they come with the page.
const states = getStates();

const id = useId();
const { cities, loading, load } = useCities();
</script>

<template>
  <label :for="id">State</label>
  <select :id="id" @change="load(($event.target as HTMLSelectElement).value)">
    <option value="">Pick a state</option>
    <option v-for="state in states" :key="state.code" :value="state.code">
      {{ state.name }}
    </option>
  </select>

  <label :for="`${id}-city`">City</label>
  <select :id="`${id}-city`" :disabled="cities.length === 0" :aria-busy="loading">
    <option value="">{{ loading ? "Loading the cities…" : "Pick a city" }}</option>
    <option v-for="city in cities" :key="city" :value="city">{{ city }}</option>
  </select>
</template>
