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
      :aria-invalid="Boolean(errors.cnpj)"
      aria-describedby="cnpj-error"
    />
    <!-- On the page from the start, and announced when it gets its text: nothing moves focus
         to the field here, so the message has to speak for itself. -->
    <p id="cnpj-error" role="alert">{{ errors.cnpj }}</p>
    <button type="submit">Submit</button>
  </form>
</template>
