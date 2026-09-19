import { useState } from "react";
import { CpfField } from "./cpf-field";

export function SignupForm() {
  const [cpf, setCpf] = useState("");

  return <CpfField value={cpf} onChange={setCpf} />;
}
