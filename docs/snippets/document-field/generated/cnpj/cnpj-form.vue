<script setup lang="ts">
import { useForm } from "vee-validate";
import { isValidCnpj } from "@brazilian-utils/brazilian-utils";
import CnpjField from "./cnpj-field.vue";

const { defineField, errors, handleSubmit } = useForm({
  initialValues: { cnpj: "" },
  validationSchema: {
    cnpj: (value: string) => isValidCnpj(value, { version: 2 }) || "Enter a valid CNPJ",
  },
});

const [cnpj] = defineField("cnpj");

const onSubmit = handleSubmit((values) => console.log(values));
</script>

<template>
  <form @submit="onSubmit">
    <CnpjField v-model="cnpj" />
    <p v-if="errors.cnpj" role="alert">{{ errors.cnpj }}</p>
    <button type="submit">Submit</button>
  </form>
</template>
