<script setup lang="ts">
import { ref } from "vue";
import CpfField from "./cpf-field.vue";

const cpf = ref("");
</script>

<template>
  <CpfField v-model="cpf" />
</template>
