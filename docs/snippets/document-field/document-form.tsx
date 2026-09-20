import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { DOCUMENTS, DocumentField, type DocumentKind } from "./document-field";

export function DocumentForm() {
  const [kind, setKind] = useState<DocumentKind>("cpf");
  const { control, handleSubmit, reset } = useForm({ defaultValues: { value: "" } });
  const spec = DOCUMENTS[kind];

  return (
    <form onSubmit={handleSubmit((values) => console.log(values))}>
      <label>
        Document
        <select
          value={kind}
          onChange={(event) => {
            setKind(event.target.value as DocumentKind);
            reset({ value: "" });
          }}
        >
          {Object.entries(DOCUMENTS).map(([value, item]) => (
            <option key={value} value={value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <Controller
        name="value"
        control={control}
        rules={{
          validate: (value) => spec.validator(value) || `Enter a valid ${spec.label}`,
        }}
        render={({ field, fieldState }) => (
          <>
            <DocumentField kind={kind} {...field} />
            {fieldState.error && <p role="alert">{fieldState.error.message}</p>}
          </>
        )}
      />

      <button type="submit">Submit</button>
    </form>
  );
}
