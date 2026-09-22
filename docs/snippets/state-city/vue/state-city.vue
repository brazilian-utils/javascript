<script setup lang="ts">
import { ref, useId } from "vue";
import { useCitiesOfState } from "./use-cities-of-state";
import { useStates } from "./use-states";

const id = useId();
const state = ref("");
const { states, loading: loadingStates, load: loadStates } = useStates();
const { cities, loading: loadingCities, load: loadCities } = useCitiesOfState(state);
</script>

<template>
  <label :for="id">State</label>
  <!-- Opening the select is what says the list is wanted, so that is when it is fetched. -->
  <select :id="id" v-model="state" :aria-busy="loadingStates" @focus="loadStates">
    <option value="">{{ loadingStates ? "Loading the states…" : "Pick a state" }}</option>
    <option v-for="current in states" :key="current.code" :value="current.code">
      {{ current.name }}
    </option>
  </select>

  <label :for="`${id}-city`">City</label>
  <select
    :id="`${id}-city`"
    :disabled="!state"
    :aria-busy="loadingCities"
    @focus="loadCities"
  >
    <option value="">{{ loadingCities ? "Loading the cities…" : "Pick a city" }}</option>
    <option v-for="city in cities" :key="city" :value="city">{{ city }}</option>
  </select>
</template>
