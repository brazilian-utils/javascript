<script setup lang="ts">
import { ref, useId } from "vue";
import { getStates } from "@brazilian-utils/brazilian-utils/get-states";
import { useCitiesOfState } from "./use-cities-of-state";

// The states are a short list, so they come with the page.
const states = getStates();

const id = useId();
const state = ref("");
const { cities, loading } = useCitiesOfState(state);
</script>

<template>
  <label :for="id">State</label>
  <select :id="id" v-model="state">
    <option value="">Pick a state</option>
    <option v-for="current in states" :key="current.code" :value="current.code">
      {{ current.name }}
    </option>
  </select>

  <label :for="`${id}-city`">City</label>
  <select :id="`${id}-city`" :disabled="cities.length === 0" :aria-busy="loading">
    <option value="">{{ loading ? "Loading the cities…" : "Pick a city" }}</option>
    <option v-for="city in cities" :key="city" :value="city">{{ city }}</option>
  </select>
</template>
