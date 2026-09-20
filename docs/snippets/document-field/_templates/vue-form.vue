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

// The attributes carry the blur handler, so the field is validated once it is left.
const [@@kind@@, @@kind@@Attrs] = defineField("@@kind@@", {
  validateOnModelUpdate: false,
});

const onSubmit = handleSubmit((values) => console.log(values));
</script>

<template>
  <form @submit="onSubmit">
    <@@Name@@Field
      v-model="@@kind@@"
      v-bind="@@kind@@Attrs"
      :aria-invalid="Boolean(errors.@@kind@@)"
      aria-describedby="@@kind@@-error"
    />
    <!-- On the page from the start, and announced when it gets its text: nothing moves focus
         to the field here, so the message has to speak for itself. -->
    <p id="@@kind@@-error" role="alert">{{ errors.@@kind@@ }}</p>
    <button type="submit">Submit</button>
  </form>
</template>
