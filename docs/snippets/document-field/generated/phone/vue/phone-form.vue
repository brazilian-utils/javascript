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

// The attributes carry the blur handler, so the field is validated once it is left.
const [phone, phoneAttrs] = defineField("phone", {
  validateOnModelUpdate: false,
});

const onSubmit = handleSubmit((values) => console.log(values));
</script>

<template>
  <form @submit="onSubmit">
    <PhoneField
      v-model="phone"
      v-bind="phoneAttrs"
      :error-message="errors.phone"
    />
    <button type="submit">Submit</button>
  </form>
</template>
