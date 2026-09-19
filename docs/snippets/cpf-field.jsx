import { useState } from "react";
import { formatCpf, isValidCpf } from "@brazilian-utils/brazilian-utils";

export function CpfField() {
  const [cpf, setCpf] = useState("");

  return (
    <label>
      CPF
      <input value={cpf} onChange={(event) => setCpf(formatCpf(event.target.value))} inputMode="numeric" />
      {cpf.length === 14 && (isValidCpf(cpf) ? "✓ Valid CPF" : "✗ Invalid CPF")}
    </label>
  );
}
