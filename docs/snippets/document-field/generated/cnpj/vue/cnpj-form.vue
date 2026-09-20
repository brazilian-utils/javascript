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

// The attributes carry the blur handler, so the field is validated once it is left.
const [cnpj, cnpjAttrs] = defineField("cnpj", {
  validateOnModelUpdate: false,
});

const onSubmit = handleSubmit((values) => console.log(values));
</script>

<template>
  <form @submit="onSubmit">
    <CnpjField
      v-model="cnpj"
      v-bind="cnpjAttrs"
      :error-message="errors.cnpj"
    />
    <button type="submit">Submit</button>
  </form>
</template>
