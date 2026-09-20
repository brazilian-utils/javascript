<script setup lang="ts">
import { useForm } from "vee-validate";
import { isValidCpf } from "@brazilian-utils/brazilian-utils";
import CpfField from "./cpf-field.vue";

const { defineField, errors, handleSubmit } = useForm({
  initialValues: { cpf: "" },
  validationSchema: {
    cpf: (value: string) => isValidCpf(value) || "Enter a valid CPF",
  },
});

const [cpf] = defineField("cpf");

const onSubmit = handleSubmit((values) => console.log(values));
</script>

<template>
  <form @submit="onSubmit">
    <CpfField v-model="cpf" />
    <p v-if="errors.cpf" role="alert">{{ errors.cpf }}</p>
    <button type="submit">Submit</button>
  </form>
</template>
