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

// The attributes carry the blur handler, so the field is validated once it is left.
const [cpf, cpfAttrs] = defineField("cpf", {
  validateOnModelUpdate: false,
});

const onSubmit = handleSubmit((values) => console.log(values));
</script>

<template>
  <form @submit="onSubmit">
    <CpfField
      v-model="cpf"
      v-bind="cpfAttrs"
      :aria-invalid="Boolean(errors.cpf)"
      aria-describedby="cpf-error"
    />
    <!-- On the page from the start, and announced when it gets its text: nothing moves focus
         to the field here, so the message has to speak for itself. -->
    <p id="cpf-error" role="alert">{{ errors.cpf }}</p>
    <button type="submit">Submit</button>
  </form>
</template>
