import { useEffect, useId, useState } from "react";
import { CepField } from "./cep-field";
import { useGetAddressByCep } from "./use-get-address-by-cep";

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
  const lookup = useGetAddressByCep(cep);

  // What the lookup found is what the form starts from; it stays editable from there.
  useEffect(() => {
    if (lookup.status === "found") setAddress(lookup.address);
    if (lookup.status === "failed") setAddress(EMPTY);
  }, [lookup]);

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
      <CepField value={cep} onChange={setCep} errorMessage={STATUS[lookup.status]} />

      {field("street", "Street", "address-line1")}
      {field("neighborhood", "Neighborhood")}
      {field("city", "City", "address-level2")}
      {field("state", "State", "address-level1")}
    </form>
  );
}
