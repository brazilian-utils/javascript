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
      :aria-invalid="Boolean(errors.cep)"
      aria-describedby="cep-error"
    />
    <!-- On the page from the start, and announced when it gets its text: nothing moves focus
         to the field here, so the message has to speak for itself. -->
    <p id="cep-error" role="alert">{{ errors.cep }}</p>
    <button type="submit">Submit</button>
  </form>
</template>
