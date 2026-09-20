<script setup lang="ts">
import { computed, ref } from "vue";
import { useForm } from "vee-validate";
import DocumentField, { DOCUMENTS, type DocumentKind } from "./document-field.vue";

const kind = ref<DocumentKind>("cpf");
const spec = computed(() => DOCUMENTS[kind.value]);

const { defineField, errors, handleSubmit, resetForm } = useForm({
  initialValues: { value: "" },
  validationSchema: {
    value: (value: string) =>
      spec.value.validator(value) || `Enter a valid ${spec.value.label}`,
  },
});

const [value] = defineField("value");

const onSubmit = handleSubmit((values) => console.log(values));
</script>

<template>
  <form @submit="onSubmit">
    <label>
      Document
      <select v-model="kind" @change="resetForm()">
        <option v-for="(item, value) in DOCUMENTS" :key="value" :value="value">
          {{ item.label }}
        </option>
      </select>
    </label>

    <DocumentField :kind="kind" v-model="value" />
    <p v-if="errors.value" role="alert">{{ errors.value }}</p>

    <button type="submit">Submit</button>
  </form>
</template>
