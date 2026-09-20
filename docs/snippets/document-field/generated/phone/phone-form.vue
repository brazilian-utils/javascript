<script setup lang="ts">
import { useForm } from "vee-validate";
import { isValidPhone } from "@brazilian-utils/brazilian-utils";
import PhoneField from "./phone-field.vue";

const { defineField, errors, handleSubmit } = useForm({
  initialValues: { phone: "" },
  validationSchema: {
    phone: (value: string) => isValidPhone(value) || "Enter a valid Phone",
  },
});

const [phone] = defineField("phone");

const onSubmit = handleSubmit((values) => console.log(values));
</script>

<template>
  <form @submit="onSubmit">
    <PhoneField v-model="phone" />
    <p v-if="errors.phone" role="alert">{{ errors.phone }}</p>
    <button type="submit">Submit</button>
  </form>
</template>
