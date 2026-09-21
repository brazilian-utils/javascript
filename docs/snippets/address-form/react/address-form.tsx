import { useEffect, useId, useState } from "react";
import { formatCep, isValidCep } from "@brazilian-utils/brazilian-utils";
import { useAddressLookup } from "./use-address-lookup";

const EMPTY = { street: "", neighborhood: "", city: "", state: "" };
const STATUS = {
  idle: "",
  loading: "Looking it up…",
  found: "",
  failed: "No address for this CEP",
};

export function AddressForm() {
  const id = useId();
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState(EMPTY);
  const { lookup, lookupCep, reset } = useAddressLookup();

  // What the lookup found is what the form starts from; it stays editable from there.
  useEffect(() => {
    if (lookup.status === "found") setAddress(lookup.address);
    if (lookup.status === "failed") setAddress(EMPTY);
  }, [lookup]);

  function onCepChange(typed: string) {
    const masked = formatCep(typed);

    setCep(masked);

    // Asking before the CEP is complete is asking for nothing.
    if (isValidCep(masked)) lookupCep(masked);
    else reset();
  }

  const field = (name: keyof typeof EMPTY, label: string, autoComplete?: string) => (
    <>
      <label htmlFor={`${id}-${name}`}>{label}</label>
      <input
        id={`${id}-${name}`}
        autoComplete={autoComplete}
        value={address[name]}
        onChange={(event) =>
          setAddress({ ...address, [name]: event.currentTarget.value })
        }
      />
    </>
  );

  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <label htmlFor={id}>CEP</label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="postal-code"
        placeholder="00000-000"
        value={cep}
        aria-describedby={`${id}-status`}
        aria-busy={lookup.status === "loading"}
        onChange={(event) => onCepChange(event.currentTarget.value)}
      />
      {/* On the page from the start, and announced when it gets its text. */}
      <output id={`${id}-status`}>{STATUS[lookup.status]}</output>

      {field("street", "Street", "address-line1")}
      {field("neighborhood", "Neighborhood")}
      {field("city", "City", "address-level2")}
      {field("state", "State", "address-level1")}
    </form>
  );
}
