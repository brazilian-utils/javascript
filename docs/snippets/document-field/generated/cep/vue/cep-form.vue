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

// The attributes carry the blur handler, so the field is validated once it is left.
const [cep, cepAttrs] = defineField("cep", {
  validateOnModelUpdate: false,
});

const onSubmit = handleSubmit((values) => console.log(values));
</script>

<template>
  <form @submit="onSubmit">
    <CepField
      v-model="cep"
      v-bind="cepAttrs"
      :error-message="errors.cep"
    />
    <button type="submit">Submit</button>
  </form>
</template>
