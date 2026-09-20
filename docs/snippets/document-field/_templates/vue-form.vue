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

// The attributes carry VeeValidate's blur handler, so the field is validated once it is left.
const [@@kind@@, @@kind@@Attrs] = defineField("@@kind@@", {
  validateOnModelUpdate: false,
});

const onSubmit = handleSubmit((values) => console.log(values));
</script>

<template>
  <form @submit="onSubmit">
    <@@Name@@Field v-model="@@kind@@" v-bind="@@kind@@Attrs" aria-describedby="@@kind@@-error" />
    <!-- On the page from the start, so a screen reader announces the message it gets. -->
    <p id="@@kind@@-error" role="alert">{{ errors.@@kind@@ }}</p>
    <button type="submit">Submit</button>
  </form>
</template>
