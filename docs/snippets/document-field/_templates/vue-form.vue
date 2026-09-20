<script setup lang="ts">
import { useForm } from "vee-validate";
@@formImports@@
import @@Name@@Field from "./@@kind@@-field.vue";

const { defineField, errors, handleSubmit } = useForm({
  initialValues: { @@kind@@: "" },
  validationSchema: {
    @@kind@@: (value: string) => @@validator@@ || "Enter a valid @@label@@",
  },
});

const [@@kind@@] = defineField("@@kind@@");

const onSubmit = handleSubmit((values) => console.log(values));
</script>

<template>
  <form @submit="onSubmit">
    <@@Name@@Field v-model="@@kind@@" />
    <p v-if="errors.@@kind@@" role="alert">{{ errors.@@kind@@ }}</p>
    <button type="submit">Submit</button>
  </form>
</template>
