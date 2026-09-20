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

// The attributes carry VeeValidate's blur handler, so the field is validated once it is left.
const [cpf, cpfAttrs] = defineField("cpf", {
  validateOnModelUpdate: false,
});

const onSubmit = handleSubmit((values) => console.log(values));
</script>

<template>
  <form @submit="onSubmit">
    <CpfField v-model="cpf" v-bind="cpfAttrs" aria-describedby="cpf-error" />
    <!-- On the page from the start, so a screen reader announces the message it gets. -->
    <p id="cpf-error" role="alert">{{ errors.cpf }}</p>
    <button type="submit">Submit</button>
  </form>
</template>
