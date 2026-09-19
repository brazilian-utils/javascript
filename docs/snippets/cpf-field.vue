<script setup>
import { ref } from "vue";
import { formatCpf, isValidCpf } from "@brazilian-utils/brazilian-utils";

const cpf = ref("");

function onInput(event) {
  cpf.value = formatCpf(event.target.value);
  event.target.value = cpf.value;
}
</script>

<template>
  <label>
    CPF
    <input :value="cpf" @input="onInput" inputmode="numeric" />
    <span v-if="cpf.length === 14">{{ isValidCpf(cpf) ? "✓ Valid CPF" : "✗ Invalid CPF" }}</span>
  </label>
</template>
