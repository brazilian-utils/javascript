<script setup lang="ts">
import { useForm } from "vee-validate";
import { isValidCep } from "@brazilian-utils/brazilian-utils";
import CepField from "./cep-field.vue";

const { defineField, errors, handleSubmit } = useForm({
  initialValues: { cep: "" },
  validationSchema: {
    cep: (value: string) => isValidCep(value) || "Enter a valid CEP",
  },
});

const [cep] = defineField("cep");

const onSubmit = handleSubmit((values) => console.log(values));
</script>

<template>
  <form @submit="onSubmit">
    <CepField v-model="cep" />
    <p v-if="errors.cep" role="alert">{{ errors.cep }}</p>
    <button type="submit">Submit</button>
  </form>
</template>
